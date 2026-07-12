'use client';
import { useState, useEffect, useRef } from 'react';
import supabase from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  Phone, MapPin, Play, Pause, Square, Camera, Package,
  CheckSquare, Mic, Clock,
  Navigation, ArrowRight, User, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, Plus, Trash2
} from 'lucide-react';
import {
  Card, KpiCard, StatusBadge, PrioritaetBadge,
  PrimaryButton, SecondaryButton, GhostButton, DangerButton,
  EmptyState, Modal, FormTextarea
} from '@/components/ui/KanalProUI';

const formatTime = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

const getTageszeit = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Guten Morgen';
  if (h < 18) return 'Guten Tag';
  return 'Guten Abend';
};

const getInitials = (name) =>
  name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';

const getAvatarColor = (name) => {
  const colors = ['bg-blue-500','bg-green-500','bg-purple-500','bg-orange-500','bg-indigo-500'];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
};

const CHECKLIST = [
  { id: 'ankunft',        label: 'Ankunft bestätigen'  },
  { id: 'kunde_info',     label: 'Kunde informiert'     },
  { id: 'fotos_vorher',   label: 'Fotos vorher'         },
  { id: 'arbeit_begonnen',label: 'Arbeit begonnen'      },
  { id: 'material_erfasst',label:'Material erfasst'     },
  { id: 'fotos_nachher',  label: 'Fotos nachher'        },
  { id: 'unterschrift',   label: 'Unterschrift'         },
  { id: 'abgeschlossen',  label: 'Einsatz abgeschlossen'},
];

export default function MeinTag() {
  const router = useRouter();
  const [loading, setLoading]         = useState(true);
  const [member, setMember]           = useState(null);
  const [auftraege, setAuftraege]     = useState([]);
  const [aktiverAuftrag, setAktiverAuftrag] = useState(null);
  const [checklist, setChecklist]     = useState({});
  const [timer, setTimer]             = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [notiz, setNotiz]             = useState('');
  const [notizModal, setNotizModal]   = useState(false);
  const [success, setSuccess]         = useState('');
  const canvasRef                     = useRef(null);
  const [signing, setSigning]         = useState(false);
  const [signatureDone, setSignatureDone] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  // ── Daten laden ────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: m } = await supabase
        .from('company_members')
        .select('company_id, vorname, nachname, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!m) { setLoading(false); return; }
      setMember(m);

      // Aufträge für heute (dem eingeloggten Techniker zugewiesen)
      const { data: a } = await supabase
        .from('auftraege')
        .select('id, titel, beschreibung, status, datum, uhrzeit, prioritaet, notdienst, adresse, kunden(name, telefon, adresse)')
        .eq('company_id', m.company_id)
        .eq('techniker_id', user.id)
        .eq('datum', today)
        .order('uhrzeit', { ascending: true, nullsFirst: false });

      const liste = a ?? [];
      setAuftraege(liste);

      // Aktiven Auftrag (in_bearbeitung) direkt aufklappen
      const aktiv = liste.find(x => x.status === 'in_bearbeitung');
      if (aktiv) setAktiverAuftrag(aktiv);

      setLoading(false);
    };
    load();
  }, []);

  // ── Timer ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!timerRunning) return;
    const iv = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [timerRunning]);

  const toggleCheck = (id) =>
    setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
  const checkCount = Object.values(checklist).filter(Boolean).length;

  // ── Canvas Unterschrift ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!signing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let drawing = false;
    let lastX = 0, lastY = 0;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const src = e.touches ? e.touches[0] : e;
      return [src.clientX - rect.left, src.clientY - rect.top];
    };
    const start = (e) => { e.preventDefault(); drawing = true; [lastX, lastY] = getPos(e); };
    const draw  = (e) => {
      if (!drawing) return;
      e.preventDefault();
      const [x, y] = getPos(e);
      ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y);
      ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.stroke();
      [lastX, lastY] = [x, y];
    };
    const end = () => { drawing = false; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove',  draw,  { passive: false });
    canvas.addEventListener('touchend',   end);

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', end);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove',  draw);
      canvas.removeEventListener('touchend',   end);
    };
  }, [signing]);

  const clearCanvas = () => {
    if (canvasRef.current) {
      canvasRef.current.getContext('2d')
        .clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setSignatureDone(false);
    }
  };

  // ── Einsatz abschließen ───────────────────────────────────────────────────────
  const handleAbschliessen = async () => {
    if (!aktiverAuftrag) return;
    await supabase
      .from('auftraege')
      .update({ status: 'abgeschlossen' })
      .eq('id', aktiverAuftrag.id);

    setAuftraege(prev =>
      prev.map(a => a.id === aktiverAuftrag.id ? { ...a, status: 'abgeschlossen' } : a)
    );
    setAktiverAuftrag(null);
    setTimerRunning(false);
    setTimer(0);
    setChecklist({});
    setSignatureDone(false);
    setSuccess('Einsatz erfolgreich abgeschlossen!');
    setTimeout(() => setSuccess(''), 4000);
  };

  const vorname     = member?.vorname || 'Techniker';
  const notdienste  = auftraege.filter(a => a.notdienst || a.prioritaet === 'notfall').length;
  const einsatzort  = (a) => a.adresse || a.kunden?.adresse || '';
  const telefon     = (a) => a.kunden?.telefon || '';

  // ── Skeleton ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_,i) => (
          <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
      <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32 md:pb-8">
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* SUCCESS BANNER */}
        {success && (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{success}</span>
          </div>
        )}

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {getTageszeit()}, {vorname}.
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className={`w-11 h-11 ${getAvatarColor(vorname)} rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0`}>
            {getInitials(vorname)}
          </div>
        </div>

        {/* KPI STRIP */}
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Einsätze"   value={auftraege.length} color="blue"  />
          <KpiCard label="Notdienste" value={notdienste}       color="red"   />
          <KpiCard label="Arbeitszeit" value={formatTime(timer)} color="gray" />
        </div>

        {/* ZEITERFASSUNG */}
        <Card>
          <div className="p-5">
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
              Zeiterfassung
            </h2>
            <div className="text-center mb-5">
              <div className="text-5xl font-mono font-bold text-gray-900 dark:text-white tabular-nums">
                {formatTime(timer)}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {timerRunning ? 'Läuft…' : 'Gestoppt'}
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              {!timerRunning ? (
                <PrimaryButton onClick={() => setTimerRunning(true)} className="px-8 py-4 text-base">
                  <Play className="w-5 h-5 mr-2 inline" /> Start
                </PrimaryButton>
              ) : (
                <SecondaryButton onClick={() => setTimerRunning(false)} className="px-8 py-4 text-base">
                  <Pause className="w-5 h-5 mr-2 inline" /> Pause
                </SecondaryButton>
              )}
              <DangerButton onClick={() => { setTimerRunning(false); setTimer(0); }} className="py-4">
                <Square className="w-5 h-5" />
              </DangerButton>
            </div>
          </div>
        </Card>

        {/* MEIN TAG — Einsatzkarten */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Mein Tag ({auftraege.length})
          </h2>
          {auftraege.length === 0 ? (
            <EmptyState
              title="Keine Einsätze heute"
              description="Für heute sind keine Aufträge geplant."
            />
          ) : (
            <div className="space-y-3">
              {auftraege.map(a => {
                const isAktiv = aktiverAuftrag?.id === a.id;
                const ort     = einsatzort(a);
                const tel     = telefon(a);
                return (
                  <Card key={a.id}>
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => setAktiverAuftrag(isAktiv ? null : a)}
                    >
                      {/* Kopfzeile */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-base font-bold text-gray-900 dark:text-white">
                              {a.uhrzeit ? String(a.uhrzeit).slice(0,5) : '–'}
                            </span>
                            <StatusBadge status={a.status} />
                            {(a.notdienst || a.prioritaet === 'notfall') && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                Notdienst
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {a.titel || a.beschreibung?.substring(0, 50) || 'Einsatz'}
                          </p>
                          {a.kunden?.name && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                              <User className="w-3 h-3" />{a.kunden.name}
                            </p>
                          )}
                          {ort && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />{ort}
                            </p>
                          )}
                        </div>
                        {isAktiv
                          ? <ChevronUp   className="w-5 h-5 text-gray-400 shrink-0 mt-1" />
                          : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0 mt-1" />}
                      </div>

                      {/* Ausgeklappt */}
                      {isAktiv && (
                        <div
                          className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3"
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="flex gap-2 flex-wrap">
                            {ort && (
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ort)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <PrimaryButton className="py-3 min-h-[48px]">
                                  <Navigation className="w-4 h-4 mr-1.5 inline" /> Navigation
                                </PrimaryButton>
                              </a>
                            )}
                            {tel && (
                              <a href={`tel:${tel}`}>
                                <SecondaryButton className="py-3 min-h-[48px]">
                                  <Phone className="w-4 h-4 mr-1.5 inline" /> Anrufen
                                </SecondaryButton>
                              </a>
                            )}
                            <SecondaryButton
                              className="py-3 min-h-[48px]"
                              onClick={() => router.push(`/dashboard/auftraege/einsatzbericht?id=${a.id}`)}
                            >
                              <ArrowRight className="w-4 h-4 mr-1.5 inline" /> Einsatzbericht
                            </SecondaryButton>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* CHECKLISTE */}
        {aktiverAuftrag && (
          <Card>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Checkliste
                </h2>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {checkCount}/{CHECKLIST.length}
                </span>
              </div>

              {/* Fortschrittsbalken */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-4">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${(checkCount / CHECKLIST.length) * 100}%` }}
                />
              </div>

              <div className="space-y-2">
                {CHECKLIST.map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all min-h-[56px] ${
                      checklist[item.id]
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                        : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      checklist[item.id]
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-400 dark:border-gray-500'
                    }`}>
                      {checklist[item.id] && <CheckCircle className="w-4 h-4 text-white" />}
                    </div>
                    <span className={`text-sm font-medium ${
                      checklist[item.id]
                        ? 'text-green-700 dark:text-green-400 line-through'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* KUNDENUNTERSCHRIFT */}
        {aktiverAuftrag && (
          <Card>
            <div className="p-5">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
                Kundenunterschrift
              </h2>
              {!signing ? (
                <div className="text-center">
                  {signatureDone ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">Unterschrift vorhanden</span>
                      </div>
                      <GhostButton onClick={() => { setSigning(true); clearCanvas(); }}>
                        Neu unterschreiben
                      </GhostButton>
                    </div>
                  ) : (
                    <PrimaryButton
                      onClick={() => setSigning(true)}
                      className="w-full py-4 text-base"
                    >
                      <User className="w-5 h-5 mr-2 inline" /> Jetzt unterschreiben
                    </PrimaryButton>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                    <canvas
                      ref={canvasRef}
                      width={500}
                      height={200}
                      className="w-full touch-none"
                      style={{ cursor: 'crosshair' }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <GhostButton onClick={clearCanvas} className="flex-1">
                      <Trash2 className="w-4 h-4 mr-1 inline" /> Löschen
                    </GhostButton>
                    <PrimaryButton
                      onClick={() => {
                        setSigning(false);
                        setSignatureDone(true);
                        if (!checklist['unterschrift']) toggleCheck('unterschrift');
                      }}
                      className="flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-1 inline" /> Übernehmen
                    </PrimaryButton>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* NOTIZ */}
        <Card>
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Notiz
              </h2>
              <GhostButton onClick={() => setNotizModal(true)}>
                <Plus className="w-4 h-4 mr-1 inline" /> Hinzufügen
              </GhostButton>
            </div>
            {notiz ? (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{notiz}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-600">Noch keine Notiz.</p>
            )}
          </div>
        </Card>

        {/* EINSATZ ABSCHLIESSEN */}
        {aktiverAuftrag && (
          <div className="pt-2">
            <PrimaryButton
              onClick={handleAbschliessen}
              className="w-full py-5 text-lg"
            >
              <CheckCircle className="w-6 h-6 mr-2 inline" /> Einsatz abschließen
            </PrimaryButton>
          </div>
        )}

        {/* SCHNELLZUGRIFF */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Schnellzugriff
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <GhostButton
              onClick={() => router.push(
                aktiverAuftrag
                  ? `/dashboard/auftraege/einsatzbericht?id=${aktiverAuftrag.id}`
                  : '/dashboard/auftraege'
              )}
              className="w-full py-4 border border-gray-200 dark:border-gray-700 rounded-xl"
            >
              Einsatzbericht
            </GhostButton>
            <GhostButton
              onClick={() => router.push('/dashboard/auftraege')}
              className="w-full py-4 border border-gray-200 dark:border-gray-700 rounded-xl"
            >
              Alle Aufträge
            </GhostButton>
          </div>
        </div>

      </div>

      {/* NOTIZ MODAL */}
      <Modal
        isOpen={notizModal}
        title="Notiz hinzufügen"
        onClose={() => setNotizModal(false)}
      >
        <div className="space-y-4">
          <FormTextarea
            label="Notiz"
            value={notiz}
            onChange={e => setNotiz(e.target.value)}
            placeholder="Deine Notiz…"
            rows={5}
          />
          <div className="flex gap-2 justify-end">
            <GhostButton onClick={() => setNotizModal(false)}>Abbrechen</GhostButton>
            <PrimaryButton onClick={() => setNotizModal(false)}>Speichern</PrimaryButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
