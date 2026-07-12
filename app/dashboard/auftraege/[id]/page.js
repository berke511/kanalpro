'use client';
import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Phone, Mail, MapPin, Calendar, Clock, User, Truck, FileText,
  ClipboardList, Receipt, Camera, MessageSquare, Edit, Navigation, ExternalLink,
  CheckCircle, Circle, AlertCircle, Plus
} from 'lucide-react';
import {
  PageHeader, Card, KpiCard, StatusBadge, PrioritaetBadge, RechnungBadge,
  PrimaryButton, SecondaryButton, GhostButton, DangerButton, EmptyState,
  Modal, FormTextarea, SuccessCard
} from '@/components/ui/KanalProUI';


const formatDate = (d) => d ? new Date(d).toLocaleDateString('de-DE') : '–';
const formatTime = (d) => d ? new Date(d).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '–';
const formatRelTime = (d) => {
  if (!d) return '–';
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Heute';
  if (days === 1) return 'Gestern';
  if (days < 7) return `vor ${days} Tagen`;
  return `vor ${Math.floor(days / 7)} Wochen`;
};

const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';
const getAvatarColor = (name) => {
  const colors = ['bg-blue-500','bg-green-500','bg-purple-500','bg-orange-500','bg-indigo-500'];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
};

const statusTimeline = [
  { key: 'erstellt', label: 'Auftrag erstellt', icon: Plus },
  { key: 'geplant', label: 'Geplant', icon: Calendar },
  { key: 'zugewiesen', label: 'Techniker zugewiesen', icon: User },
  { key: 'unterwegs', label: 'Unterwegs', icon: Navigation },
  { key: 'vor_ort', label: 'Vor Ort', icon: MapPin },
  { key: 'in_bearbeitung', label: 'In Bearbeitung', icon: Clock },
  { key: 'abgeschlossen', label: 'Abgeschlossen', icon: CheckCircle },
  { key: 'rechnung', label: 'Rechnung erstellt', icon: Receipt },
];

export default function AuftragWorkspace() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [auftrag, setAuftrag] = useState(null);
  const [kunde, setKunde] = useState(null);
  const [techniker, setTechniker] = useState(null);
  const [fahrzeug, setFahrzeug] = useState(null);
  const [rechnung, setRechnung] = useState(null);
  const [neueNotiz, setNeueNotiz] = useState('');
  const [notizModal, setNotizModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single();
      if (!member) return;
      const companyId = member.company_id;

      const { data: a } = await supabase.from('auftraege').select('*').eq('id', id).eq('company_id', companyId).single();
      if (!a) { setLoading(false); return; }
      setAuftrag(a);

      const promises = [];
      if (a.kunden_id || a.kunde_id) {
        promises.push(supabase.from('kunden').select('*').eq('id', a.kunden_id || a.kunde_id).single().then(r => setKunde(r.data)));
      }
      if (a.techniker_id) {
        promises.push(supabase.from('techniker').select('*').eq('id', a.techniker_id).single().then(r => setTechniker(r.data)));
      }
      if (a.fahrzeug_id) {
        promises.push(supabase.from('fahrzeuge').select('*').eq('id', a.fahrzeug_id).single().then(r => setFahrzeug(r.data)));
      }
      promises.push(
        supabase.from('rechnungen').select('*').eq('auftrag_id', id).eq('company_id', companyId).order('created_at', { ascending: false }).limit(1).then(r => setRechnung(r.data?.[0] || null)),
      );
      await Promise.all(promises);
      setLoading(false);
    };
    load();
  }, [id]);

  const saveNotiz = async () => {
    if (!neueNotiz.trim()) return;
    setSaving(true);
    const timestamp = new Date().toLocaleString('de-DE');
    const newEntry = `[${timestamp}] ${neueNotiz}`;
    const combined = auftrag.interne_notiz ? auftrag.interne_notiz + '\n\n' + newEntry : newEntry;
    await supabase.from('auftraege').update({ interne_notiz: combined }).eq('id', id);
    setAuftrag(prev => ({ ...prev, interne_notiz: combined }));
    setNeueNotiz('');
    setNotizModal(false);
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const getStatusProgress = (status) => {
    const map = { 'offen': 0, 'geplant': 1, 'in_bearbeitung': 5, 'abgeschlossen': 6 };
    return map[status] ?? 0;
  };

  if (loading) return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}
      </div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />)}
      </div>
    </div>
  );

  if (!auftrag) return (
    <div className="p-6"><EmptyState title="Auftrag nicht gefunden" description="Dieser Auftrag existiert nicht oder wurde gelöscht." /></div>
  );

  const progress = getStatusProgress(auftrag.status);
  const adresse = auftrag.einsatzort || auftrag.adresse || kunde?.adresse || '';
  const mapsUrl = adresse ? `https://maps.google.com/?q=${encodeURIComponent(adresse)}` : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Back */}
        <GhostButton onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Zurück
        </GhostButton>

        {success && (
          <SuccessCard>
            <span className="font-semibold">Notiz gespeichert.</span>
          </SuccessCard>
        )}

        {/* HEADER */}
        <Card>
          <div className="p-5">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{auftrag.auftragsnummer || `#${id.substring(0,8).toUpperCase()}`}</span>
                  <StatusBadge status={auftrag.status} />
                  {auftrag.notdienst && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Notdienst</span>}
                  {auftrag.prioritaet && <PrioritaetBadge prioritaet={auftrag.prioritaet} />}
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{auftrag.titel || auftrag.beschreibung?.substring(0, 60) || 'Auftrag'}</h1>
                <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                  {auftrag.datum && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(auftrag.datum)}</span>}
                  {auftrag.uhrzeit && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{auftrag.uhrzeit}</span>}
                  {auftrag.dauer && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{auftrag.dauer}</span>}
                  {kunde && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{kunde.name}</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <SecondaryButton onClick={() => router.push(`/dashboard/auftraege/${id}/bearbeiten`)}>
                  <Edit className="w-4 h-4 mr-1" /> Bearbeiten
                </SecondaryButton>
                <SecondaryButton onClick={() => router.push(`/dashboard/auftraege/einsatzbericht?auftragId=${id}`)}>
                  <ClipboardList className="w-4 h-4 mr-1" /> Einsatzbericht
                </SecondaryButton>
                {!rechnung ? (
                  <PrimaryButton onClick={() => router.push(`/dashboard/rechnungen/neu?auftragId=${id}`)}>
                    <Receipt className="w-4 h-4 mr-1" /> Rechnung erstellen
                  </PrimaryButton>
                ) : (
                  <GhostButton onClick={() => router.push(`/dashboard/rechnungen/${rechnung.id}`)}>
                    <Receipt className="w-4 h-4 mr-1" /> Rechnung öffnen
                  </GhostButton>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* KPI STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <KpiCard label="Status" value={auftrag.status === 'abgeschlossen' ? 'Fertig' : auftrag.status === 'in_bearbeitung' ? 'Aktiv' : 'Offen'} />
          <KpiCard label="Priorität" value={auftrag.prioritaet || (auftrag.notdienst ? 'Notdienst' : 'Normal')} />
          <KpiCard label="Dauer" value={auftrag.dauer || '–'} />
          <KpiCard label="Techniker" value={techniker?.name?.split(' ')[0] || '–'} />
          <KpiCard label="Fahrzeug" value={fahrzeug?.kennzeichen || '–'} />
          <KpiCard label="Rechnung" value={rechnung ? (rechnung.status === 'bezahlt' ? 'Bezahlt' : 'Offen') : 'Keine'} />
        </div>

        {/* MAIN: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT */}
          <div className="lg:col-span-1 space-y-4">

            {/* Auftrag Details */}
            <Card>
              <div className="p-5 space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Auftragsdetails</h3>
                {auftrag.beschreibung && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{auftrag.beschreibung}</p>
                )}
                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  {auftrag.datum && <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-gray-400 shrink-0" /><span className="text-gray-700 dark:text-gray-300">{formatDate(auftrag.datum)}{auftrag.uhrzeit ? ` · ${auftrag.uhrzeit}` : ''}</span></div>}
                  {auftrag.dauer && <div className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-gray-400 shrink-0" /><span className="text-gray-700 dark:text-gray-300">{auftrag.dauer}</span></div>}
                  {(auftrag.created_at || auftrag.erstellt_am) && <div className="flex items-center gap-2 text-sm"><Circle className="w-4 h-4 text-gray-400 shrink-0" /><span className="text-gray-500 dark:text-gray-400">Erstellt {formatRelTime(auftrag.created_at || auftrag.erstellt_am)}</span></div>}
                </div>
              </div>
            </Card>

            {/* Kunde */}
            {kunde && (
              <Card>
                <div className="p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Kunde</h3>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${getAvatarColor(kunde.name)} rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0`}>{getInitials(kunde.name)}</div>
                    <div><p className="font-medium text-gray-900 dark:text-white">{kunde.name}</p></div>
                  </div>
                  <div className="space-y-1.5">
                    {kunde.telefon && <a href={`tel:${kunde.telefon}`} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600"><Phone className="w-3.5 h-3.5" />{kunde.telefon}</a>}
                    {kunde.email && <a href={`mailto:${kunde.email}`} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600"><Mail className="w-3.5 h-3.5" />{kunde.email}</a>}
                    {kunde.adresse && <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />{kunde.adresse}</div>}
                  </div>
                  <GhostButton className="w-full justify-center" onClick={() => router.push(`/dashboard/kunden/${kunde.id}`)}>
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> Kundenakte öffnen
                  </GhostButton>
                </div>
              </Card>
            )}

            {/* Einsatzort */}
            {adresse && (
              <Card>
                <div className="p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Einsatzort</h3>
                  <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"><MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />{adresse}</div>
                  {mapsUrl && (
                    <div className="flex gap-2">
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <SecondaryButton className="w-full justify-center"><Navigation className="w-3.5 h-3.5 mr-1" /> Navigation</SecondaryButton>
                      </a>
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <GhostButton className="w-full justify-center"><ExternalLink className="w-3.5 h-3.5 mr-1" /> Maps</GhostButton>
                      </a>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Techniker */}
            {techniker && (
              <Card>
                <div className="p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Techniker</h3>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${getAvatarColor(techniker.name)} rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0`}>{getInitials(techniker.name)}</div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{techniker.name}</p>
                      {techniker.rolle && <p className="text-xs text-gray-500 dark:text-gray-400">{techniker.rolle}</p>}
                    </div>
                  </div>
                  {techniker.telefon && <a href={`tel:${techniker.telefon}`} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600"><Phone className="w-3.5 h-3.5" />{techniker.telefon}</a>}
                </div>
              </Card>
            )}

            {/* Fahrzeug */}
            {fahrzeug && (
              <Card>
                <div className="p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fahrzeug</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center shrink-0"><Truck className="w-5 h-5 text-gray-500" /></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white font-mono">{fahrzeug.kennzeichen}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{fahrzeug.marke} {fahrzeug.modell}</p>
                    </div>
                  </div>
                  {fahrzeug.kilometerstand && <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><span>{fahrzeug.kilometerstand?.toLocaleString('de-DE')} km</span></div>}
                  {(fahrzeug.status || fahrzeug.zustand) && <div><StatusBadge status={fahrzeug.status || fahrzeug.zustand} /></div>}
                </div>
              </Card>
            )}

          </div>

          {/* RIGHT: Timeline + Rechnung + Notizen + Fotos */}
          <div className="lg:col-span-2 space-y-6">

            {/* Live Status Timeline */}
            <Card>
              <div className="p-5">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-5">Live-Verlauf</h3>
                <div className="border-l-2 border-gray-200 dark:border-gray-700 ml-4 space-y-0">
                  {statusTimeline.map((step, i) => {
                    const done = i <= progress;
                    const active = i === progress;
                    const Icon = step.icon;
                    return (
                      <div key={step.key} className="flex gap-4 relative pl-6 pb-5">
                        <div className={`absolute left-[-9px] top-1 w-4 h-4 rounded-full flex items-center justify-center border-2 ${done ? 'bg-blue-500 border-blue-500' : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'}`}>
                          {done && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${active ? 'text-blue-600 dark:text-blue-400' : done ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}`}>{step.label}</p>
                          {active && <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">Aktueller Status</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* Rechnung Status */}
            {rechnung && (
              <Card>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Rechnung</h3>
                    <RechnungBadge status={rechnung.status} />
                  </div>
                  <div className="space-y-1.5 text-sm">
                    {rechnung.rechnungsnummer && <p className="text-gray-700 dark:text-gray-300 font-mono">{rechnung.rechnungsnummer}</p>}
                    {(rechnung.gesamtbetrag || rechnung.betrag) && <p className="text-lg font-semibold text-gray-900 dark:text-white">{Number(rechnung.gesamtbetrag || rechnung.betrag).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</p>}
                  </div>
                  <GhostButton className="mt-3 w-full justify-center" onClick={() => router.push(`/dashboard/rechnungen/${rechnung.id}`)}>
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> Rechnung öffnen
                  </GhostButton>
                </div>
              </Card>
            )}

            {/* Notizen */}
            <Card>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Interne Notizen</h3>
                  <GhostButton onClick={() => setNotizModal(true)}><Plus className="w-4 h-4 mr-1" /> Notiz</GhostButton>
                </div>
                {auftrag.interne_notiz ? (
                  <div className="space-y-3">
                    {auftrag.interne_notiz.split('\n\n').filter(Boolean).map((n, i) => (
                      <div key={i} className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{n}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="Keine Notizen" description="Interne Notizen für diesen Auftrag." />
                )}
              </div>
            </Card>

            {/* Fotos Placeholder */}
            <Card>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fotodokumentation</h3>
                </div>
                <EmptyState title="Fotos über Einsatzbericht" description="Fotos werden beim Einsatzbericht hochgeladen." />
                <div className="mt-3">
                  <SecondaryButton className="w-full justify-center" onClick={() => router.push(`/dashboard/auftraege/einsatzbericht?auftragId=${id}`)}>
                    <Camera className="w-4 h-4 mr-1" /> Zum Einsatzbericht
                  </SecondaryButton>
                </div>
              </div>
            </Card>

          </div>
        </div>

        {/* Notiz Modal */}
        <Modal isOpen={notizModal} title="Notiz hinzufügen" onClose={() => setNotizModal(false)}>
          <div className="space-y-4">
            <FormTextarea
              label="Notiz"
              value={neueNotiz}
              onChange={e => setNeueNotiz(e.target.value)}
              placeholder="Interne Notiz..."
              rows={4}
            />
            <div className="flex gap-2 justify-end">
              <GhostButton onClick={() => setNotizModal(false)}>Abbrechen</GhostButton>
              <PrimaryButton onClick={saveNotiz} disabled={saving}>{saving ? 'Speichern...' : 'Speichern'}</PrimaryButton>
            </div>
          </div>
        </Modal>

      </div>
    </div>
  );
}
