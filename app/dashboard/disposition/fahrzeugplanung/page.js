'use client';
import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';
import {
  Car, Truck, AlertTriangle, CheckCircle,
  Clock, Calendar, Wrench, X, RefreshCw
} from 'lucide-react';

export default function FahrzeugplanungPage() {
  const [fahrzeuge, setFahrzeuge] = useState([]);
  const [auftraege, setAuftraege] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('heute');
  const [assignModal, setAssignModal] = useState(null);
  const [selectedAuftrag, setSelectedAuftrag] = useState('');
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const getWeekRange = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
    };
  };

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: member } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      if (!member) return;

      const { data: fz } = await supabase
        .from('fahrzeuge')
        .select('id, kennzeichen, marke, modell, typ, baujahr, zustand, km_stand, standort')
        .eq('company_id', member.company_id)
        .order('kennzeichen');

      const week = getWeekRange();
      const { data: ag } = await supabase
        .from('auftraege')
        .select('id, titel, status, datum, uhrzeit, dauer_minuten, prioritaet, adresse, fahrzeug_id, mitarbeiter:techniker_id(vorname, nachname)')
        .eq('company_id', member.company_id)
        .gte('datum', week.start)
        .lte('datum', week.end)
        .order('datum')
        .order('uhrzeit');

      setFahrzeuge(fz || []);
      setAuftraege(ag || []);
    } catch (e) {
      console.error('Fehler beim Laden:', e);
    } finally {
      setLoading(false);
    }
  }

  const todayAuftraege = auftraege.filter(a => a.datum === today);

  const getFahrzeugStatus = (fz) => {
    if (fz.zustand && fz.zustand !== 'aktiv') return 'ausser_betrieb';
    if (todayAuftraege.some(a => a.fahrzeug_id === fz.id)) return 'im_einsatz';
    return 'frei';
  };

  const stats = {
    gesamt: fahrzeuge.length,
    imEinsatz: fahrzeuge.filter(fz => getFahrzeugStatus(fz) === 'im_einsatz').length,
    frei: fahrzeuge.filter(fz => getFahrzeugStatus(fz) === 'frei').length,
    ausserBetrieb: fahrzeuge.filter(fz => getFahrzeugStatus(fz) === 'ausser_betrieb').length,
  };

  const getFilteredFahrzeuge = () => {
    if (activeView === 'frei') return fahrzeuge.filter(fz => getFahrzeugStatus(fz) === 'frei');
    return fahrzeuge;
  };

  const getEinsaetze = (fzId) => {
    if (activeView === 'heute') return auftraege.filter(a => a.datum === today && a.fahrzeug_id === fzId);
    if (activeView === 'woche') return auftraege.filter(a => a.fahrzeug_id === fzId);
    return [];
  };

  const offeneAuftraege = auftraege.filter(
    a => a.datum === today && !a.fahrzeug_id && a.status !== 'abgeschlossen'
  );

  async function handleAssign() {
    if (!assignModal || !selectedAuftrag) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('auftraege')
        .update({ fahrzeug_id: assignModal.id })
        .eq('id', selectedAuftrag);
      if (!error) {
        setAssignModal(null);
        setSelectedAuftrag('');
        await loadData();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(auftragId) {
    await supabase.from('auftraege').update({ fahrzeug_id: null }).eq('id', auftragId);
    await loadData();
  }

  const statusConfig = {
    frei: {
      label: 'Frei',
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800',
      iconBg: 'bg-green-50 dark:bg-green-900/20',
    },
    im_einsatz: {
      label: 'Im Einsatz',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-800 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
      iconBg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    ausser_betrieb: {
      label: 'Ausser Betrieb',
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-800 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800',
      iconBg: 'bg-red-50 dark:bg-red-900/20',
    },
  };

  const auftragStatusCfg = {
    offen: { label: 'Offen', color: 'text-yellow-600 dark:text-yellow-400' },
    in_bearbeitung: { label: 'In Bearbeitung', color: 'text-blue-600 dark:text-blue-400' },
    abgeschlossen: { label: 'Abgeschlossen', color: 'text-green-600 dark:text-green-400' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  const filteredFahrzeuge = getFilteredFahrzeuge();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fahrzeugplanung</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString('de-DE', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw size={14} />
          Aktualisieren
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Fahrzeuge gesamt', value: stats.gesamt, Icon: Truck, bg: 'bg-gray-100 dark:bg-gray-800', color: 'text-gray-600 dark:text-gray-400' },
          { label: 'Im Einsatz', value: stats.imEinsatz, Icon: Clock, bg: 'bg-blue-50 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Freie Fahrzeuge', value: stats.frei, Icon: CheckCircle, bg: 'bg-green-50 dark:bg-green-900/30', color: 'text-green-600 dark:text-green-400' },
          { label: 'Ausser Betrieb', value: stats.ausserBetrieb, Icon: AlertTriangle, bg: 'bg-red-50 dark:bg-red-900/30', color: 'text-red-600 dark:text-red-400' },
        ].map(({ label, value, Icon, bg, color }) => (
          <div key={label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${bg}`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {[
          { key: 'heute', label: 'Heute' },
          { key: 'woche', label: 'Diese Woche' },
          { key: 'frei', label: 'Freie Fahrzeuge' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeView === tab.key
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredFahrzeuge.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <Car size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Keine Fahrzeuge gefunden</p>
          </div>
        ) : (
          filteredFahrzeuge.map(fz => {
            const status = getFahrzeugStatus(fz);
            const cfg = statusConfig[status];
            const einsaetze = getEinsaetze(fz.id);
            const isLkw = fz.typ === 'transporter' || fz.typ === 'lkw';

            return (
              <div
                key={fz.id}
                className={`bg-white dark:bg-gray-900 border rounded-xl overflow-hidden ${
                  status === 'ausser_betrieb' ? 'opacity-60 ' : ''
                }${cfg.border}`}
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${cfg.iconBg}`}>
                      {status === 'ausser_betrieb'
                        ? <Wrench size={18} className={cfg.text} />
                        : isLkw
                        ? <Truck size={18} className={cfg.text} />
                        : <Car size={18} className={cfg.text} />
                      }
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">
                          {fz.kennzeichen}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {[fz.marke, fz.modell, fz.baujahr ? `(${fz.baujahr})` : null]
                          .filter(Boolean).join(' ')}
                        {fz.standort && ` · ${fz.standort}`}
                        {fz.km_stand != null && ` · ${fz.km_stand.toLocaleString('de-DE')} km`}
                      </p>
                    </div>
                  </div>
                  {status !== 'ausser_betrieb' && (
                    <button
                      onClick={() => { setAssignModal(fz); setSelectedAuftrag(''); }}
                      className="flex-shrink-0 flex items-center gap-1.5 ml-3 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      <Calendar size={12} />
                      Zuweisen
                    </button>
                  )}
                </div>

                {einsaetze.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800">
                    {einsaetze.map(ag => {
                      const stCfg = auftragStatusCfg[ag.status] || { label: ag.status, color: 'text-gray-500' };
                      return (
                        <div key={ag.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <Clock size={13} className="text-gray-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                {ag.titel}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                {ag.datum}
                                {ag.uhrzeit && ` · ${ag.uhrzeit}`}
                                {ag.mitarbeiter && ` · ${ag.mitarbeiter.vorname} ${ag.mitarbeiter.nachname}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className={`text-xs font-medium ${stCfg.color}`}>
                              {stCfg.label}
                            </span>
                            <button
                              onClick={() => handleRemove(ag.id)}
                              className="p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 rounded transition-colors"
                              title="Fahrzeug entfernen"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {einsaetze.length === 0 && activeView !== 'frei' && (
                  <div className="px-4 pb-3 border-t border-gray-50 dark:border-gray-800">
                    <p className="text-xs text-gray-400 dark:text-gray-600 mt-2">
                      {activeView === 'heute' ? 'Keine Einsaetze heute' : 'Keine Einsaetze diese Woche'}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {assignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                  Auftrag zuweisen
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {assignModal.kennzeichen}
                  {assignModal.marke && ` · ${assignModal.marke}`}
                  {assignModal.modell && ` ${assignModal.modell}`}
                </p>
              </div>
              <button
                onClick={() => setAssignModal(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {offeneAuftraege.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                  Keine offenen Auftraege fuer heute ohne Fahrzeugzuweisung
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Offene Auftraege heute ohne Fahrzeug:
                  </p>
                  {offeneAuftraege.map(ag => (
                    <label
                      key={ag.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedAuftrag === ag.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="auftrag_select"
                        checked={selectedAuftrag === ag.id}
                        onChange={() => setSelectedAuftrag(ag.id)}
                        className="mt-0.5 accent-blue-600"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {ag.titel}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {ag.uhrzeit || 'Keine Uhrzeit'}
                          {ag.adresse && ` · ${ag.adresse.substring(0, 50)}`}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setAssignModal(null)}
                className="flex-1 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedAuftrag || saving}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Speichern...' : 'Zuweisen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
