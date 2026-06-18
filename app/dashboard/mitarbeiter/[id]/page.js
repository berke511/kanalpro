'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import {
  ROLE_LABELS, ROLE_COLORS, PERMISSIONS, roleHasPermission,
} from '@/lib/roles';

const TABS = [
  { id: 'stammdaten',    label: 'Stammdaten' },
  { id: 'rollen',        label: 'Rollen & Rechte' },
  { id: 'arbeitszeiten', label: 'Arbeitszeiten' },
  { id: 'urlaub',        label: 'Urlaub & Abwesenheiten' },
  { id: 'zertifikate',   label: 'Zertifikate & Schulungen' },
  { id: 'fahrzeuge',     label: 'Fahrzeuge' },
];

const FELDER = [
  { section: 'Basis', fields: [
    { name: 'vorname',  label: 'Vorname',      type: 'text',  required: true },
    { name: 'nachname', label: 'Nachname',      type: 'text',  required: true },
    { name: 'email',    label: 'E-Mail',        type: 'email', required: false },
    { name: 'telefon',  label: 'Telefon',       type: 'tel',   required: false },
  ]},
  { section: 'Persönlich', fields: [
    { name: 'geburtsdatum', label: 'Geburtsdatum', type: 'date', required: false },
    { name: 'strasse',      label: 'Straße',        type: 'text', required: false },
    { name: 'plz',          label: 'PLZ',           type: 'text', required: false },
    { name: 'ort',          label: 'Ort',           type: 'text', required: false },
  ]},
  { section: 'Beschäftigung', fields: [
    { name: 'eintrittsdatum', label: 'Eintrittsdatum',   type: 'date',   required: false },
    { name: 'position',       label: 'Position / Rolle', type: 'text',   required: false },
    { name: 'stundenlohn',    label: 'Stundenlohn (€)',  type: 'number', required: false },
  ]},
];

const ROLE_ORDER = ['inhaber', 'administrator', 'disponent', 'buero', 'techniker', 'fahrer'];

const ROLE_DESCRIPTIONS = {
  inhaber:       'Vollzugriff auf alle Bereiche inkl. Billing.',
  administrator: 'Vollzugriff auf alle Bereiche außer Billing.',
  disponent:     'Kann Aufträge planen und Ressourcen koordinieren.',
  buero:         'Kann Kunden, Aufträge und Rechnungen verwalten.',
  techniker:     'Kann eigene Aufträge und Dokumentation verwalten.',
  fahrer:        'Kann eigene Aufträge anzeigen.',
};

const PERM_GROUPS = [
  { label: 'Kunden',        perms: ['kunden.view','kunden.create','kunden.edit','kunden.delete'] },
  { label: 'Aufträge',      perms: ['auftraege.view','auftraege.create','auftraege.edit','auftraege.delete','auftraege.assign'] },
  { label: 'Rechnungen',    perms: ['rechnungen.view','rechnungen.create','rechnungen.edit','rechnungen.delete'] },
  { label: 'Einsatzplanung',perms: ['disposition.view','disposition.edit'] },
  { label: 'Fahrzeuge',     perms: ['fahrzeuge.view','fahrzeuge.edit'] },
  { label: 'Dokumente',     perms: ['dokumente.view','dokumente.upload','dokumente.delete'] },
  { label: 'Einstellungen', perms: ['einstellungen.view','einstellungen.edit','members.view','members.invite','members.edit'] },
];

const PERM_LABELS = {
  'kunden.view':        'Anzeigen',
  'kunden.create':      'Erstellen',
  'kunden.edit':        'Bearbeiten',
  'kunden.delete':      'Löschen',
  'auftraege.view':     'Anzeigen',
  'auftraege.create':   'Erstellen',
  'auftraege.edit':     'Bearbeiten',
  'auftraege.delete':   'Löschen',
  'auftraege.assign':   'Zuweisen',
  'rechnungen.view':    'Anzeigen',
  'rechnungen.create':  'Erstellen',
  'rechnungen.edit':    'Bearbeiten',
  'rechnungen.delete':  'Löschen',
  'disposition.view':   'Anzeigen',
  'disposition.edit':   'Bearbeiten',
  'fahrzeuge.view':     'Anzeigen',
  'fahrzeuge.edit':     'Bearbeiten',
  'dokumente.view':     'Anzeigen',
  'dokumente.upload':   'Hochladen',
  'dokumente.delete':   'Löschen',
  'einstellungen.view': 'Anzeigen',
  'einstellungen.edit': 'Bearbeiten',
  'members.view':       'Team anzeigen',
  'members.invite':     'Einladen',
  'members.edit':       'Bearbeiten',
};

const TYP_LABELS = {
  arbeit:    'Arbeit',
  urlaub:    'Urlaub',
  krank:     'Krank',
  feiertag:  'Feiertag',
  sonstiges: 'Sonstiges',
};

const TYP_COLORS = {
  arbeit:    'bg-blue-50 text-blue-700',
  urlaub:    'bg-green-50 text-green-700',
  krank:     'bg-red-50 text-red-600',
  feiertag:  'bg-purple-50 text-purple-700',
  sonstiges: 'bg-gray-50 text-gray-600',
};

const MONAT_NAMEN = [
  'Januar','Februar','März','April','Mai','Juni',
  'Juli','August','September','Oktober','November','Dezember',
];

const ARBEITSMODELL_OPTIONS = [
  { value: 'vollzeit', label: 'Vollzeit' },
  { value: 'teilzeit', label: 'Teilzeit' },
  { value: 'minijob',  label: 'Minijob' },
];

const UA_TYP_OPTIONS = [
  { value: 'urlaub',    label: 'Urlaub' },
  { value: 'krank',     label: 'Krank' },
  { value: 'feiertag',  label: 'Feiertag' },
  { value: 'sonstiges', label: 'Sonstiges' },
];

function nettoMinuten(e) {
  if (!e.beginn || !e.ende) return null;
  const [bH, bM] = e.beginn.split(':').map(Number);
  const [eH, eM] = e.ende.split(':').map(Number);
  return (eH * 60 + eM) - (bH * 60 + bM) - (e.pause_minuten || 0);
}

function formatStunden(min) {
  if (min == null || isNaN(min)) return '—';
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min) % 60;
  return `${min < 0 ? '-' : ''}${h}:${String(m).padStart(2, '0')} h`;
}

function sollStundenImMonat(jahr, monat, wochenstunden) {
  if (!wochenstunden) return null;
  const tage = new Date(jahr, monat, 0).getDate();
  let arbeitstage = 0;
  for (let d = 1; d <= tage; d++) {
    const wd = new Date(jahr, monat - 1, d).getDay();
    if (wd !== 0 && wd !== 6) arbeitstage++;
  }
  return arbeitstage * (parseFloat(wochenstunden) / 5);
}

function formatDatum(datum) {
  const [year, month, day] = datum.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

export default function MitarbeiterProfilPage() {
  const router = useRouter();
  const { id } = useParams();
  const [tab, setTab] = useState('stammdaten');
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Rollen & Rechte state
  const [rolle, setRolle] = useState(null);
  const [rolleSaving, setRolleSaving] = useState(false);
  const [rolleSaved, setRolleSaved] = useState(false);
  const [rollePreview, setRollePreview] = useState(null);

  // Arbeitszeiten state
  const [companyId, setCompanyId] = useState(null);
  const [vertrag, setVertrag] = useState({
    arbeitsmodell: null,
    wochenstunden: '',
    soll_beginn: '',
    soll_ende: '',
  });
  const [vertragSaving, setVertragSaving] = useState(false);
  const [vertragSaved, setVertragSaved] = useState(false);
  const [azJahr, setAzJahr] = useState(new Date().getFullYear());
  const [azMonat, setAzMonat] = useState(new Date().getMonth() + 1);
  const [eintraege, setEintraege] = useState([]);
  const [azLaden, setAzLaden] = useState(false);
  const [neuForm, setNeuForm] = useState({
    datum: '',
    beginn: '',
    ende: '',
    pause_minuten: '0',
    typ: 'arbeit',
    notiz: '',
  });
  const [neuShown, setNeuShown] = useState(false);
  const [neuSaving, setNeuSaving] = useState(false);
  const [deletingAzId, setDeletingAzId] = useState(null);

  // Zertifikate & Schulungen state
  const [zertifikate, setZertifikate] = useState([]);
  const [zertLaden, setZertLaden] = useState(false);
  const [zertNeuShown, setZertNeuShown] = useState(false);
  const [zertNeuSaving, setZertNeuSaving] = useState(false);
  const [deletingZertId, setDeletingZertId] = useState(null);
  const [zertForm, setZertForm] = useState({
    name: '', ausstellende_stelle: '', ausgestellt_am: '', gueltig_bis: '', notiz: '',
  });

  // Urlaub & Abwesenheiten state
  const [urlaubsanspruch, setUrlaubsanspruch] = useState('30');
  const [anspruchSaving, setAnspruchSaving] = useState(false);
  const [anspruchSaved, setAnspruchSaved] = useState(false);
  const [uaJahr, setUaJahr] = useState(new Date().getFullYear());
  const [abwesenheiten, setAbwesenheiten] = useState([]);
  const [uaLaden, setUaLaden] = useState(false);
  const [uaNeuForm, setUaNeuForm] = useState({ von: '', bis: '', typ: 'urlaub', notiz: '', skipWE: true });
  const [uaNeuShown, setUaNeuShown] = useState(false);
  const [uaNeuSaving, setUaNeuSaving] = useState(false);
  const [deletingUaId, setDeletingUaId] = useState(null);

  // Load mitarbeiter base data
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data, error: dbError } = await supabase
        .from('mitarbeiter')
        .select('*')
        .eq('id', id)
        .single();

      if (dbError || !data) { router.push('/dashboard/mitarbeiter'); return; }

      setForm({
        vorname:         data.vorname ?? '',
        nachname:        data.nachname ?? '',
        email:           data.email ?? '',
        telefon:         data.telefon ?? '',
        geburtsdatum:    data.geburtsdatum ?? '',
        strasse:         data.strasse ?? '',
        plz:             data.plz ?? '',
        ort:             data.ort ?? '',
        eintrittsdatum:  data.eintrittsdatum ?? '',
        position:        data.position ?? '',
        stundenlohn:     data.stundenlohn != null ? String(data.stundenlohn) : '',
        notizen:         data.notizen ?? '',
      });
      setRolle(data.rolle ?? null);
      setRollePreview(data.rolle ?? null);
      setCompanyId(data.company_id);
      setVertrag({
        arbeitsmodell: data.arbeitsmodell ?? null,
        wochenstunden: data.wochenstunden != null ? String(data.wochenstunden) : '',
        soll_beginn:   data.soll_beginn ?? '',
        soll_ende:     data.soll_ende ?? '',
      });
      setUrlaubsanspruch(data.urlaubsanspruch != null ? String(data.urlaubsanspruch) : '30');
      setLoading(false);
    }
    load();
  }, [id, router]);

  // Load Arbeitszeiten for selected month
  useEffect(() => {
    if (!id) return;
    async function loadAz() {
      setAzLaden(true);
      const von = `${azJahr}-${String(azMonat).padStart(2, '0')}-01`;
      const letzterTag = new Date(azJahr, azMonat, 0).getDate();
      const bis = `${azJahr}-${String(azMonat).padStart(2, '0')}-${String(letzterTag).padStart(2, '0')}`;
      const { data } = await supabase
        .from('arbeitszeiten')
        .select('*')
        .eq('mitarbeiter_id', id)
        .gte('datum', von)
        .lte('datum', bis)
        .order('datum');
      setEintraege(data ?? []);
      setAzLaden(false);
    }
    loadAz();
  }, [id, azJahr, azMonat]);

  // Load Zertifikate
  useEffect(() => {
    if (!id) return;
    async function loadZertifikate() {
      setZertLaden(true);
      const { data } = await supabase
        .from('zertifikate')
        .select('*')
        .eq('mitarbeiter_id', id)
        .order('gueltig_bis', { ascending: true, nullsFirst: false });
      setZertifikate(data ?? []);
      setZertLaden(false);
    }
    loadZertifikate();
  }, [id]);

  // Load Abwesenheiten for selected year
  useEffect(() => {
    if (!id) return;
    async function loadAbwesenheiten() {
      setUaLaden(true);
      const { data } = await supabase
        .from('arbeitszeiten')
        .select('*')
        .eq('mitarbeiter_id', id)
        .in('typ', ['urlaub', 'krank', 'feiertag', 'sonstiges'])
        .gte('datum', `${uaJahr}-01-01`)
        .lte('datum', `${uaJahr}-12-31`)
        .order('datum');
      setAbwesenheiten(data ?? []);
      setUaLaden(false);
    }
    loadAbwesenheiten();
  }, [id, uaJahr]);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setSaved(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    if (!form.vorname.trim() || !form.nachname.trim()) {
      setError('Vor- und Nachname sind Pflichtfelder.');
      return;
    }
    setSaving(true);

    const payload = {
      vorname:        form.vorname.trim(),
      nachname:       form.nachname.trim(),
      email:          form.email.trim(),
      telefon:        form.telefon.trim(),
      geburtsdatum:   form.geburtsdatum || null,
      strasse:        form.strasse.trim(),
      plz:            form.plz.trim(),
      ort:            form.ort.trim(),
      eintrittsdatum: form.eintrittsdatum || null,
      position:       form.position.trim(),
      stundenlohn:    form.stundenlohn ? parseFloat(form.stundenlohn) : null,
      notizen:        form.notizen.trim(),
    };

    const { error: dbError } = await supabase
      .from('mitarbeiter')
      .update(payload)
      .eq('id', id);

    setSaving(false);
    if (dbError) { setError(dbError.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleRolleSave() {
    setRolleSaving(true);
    const { error: dbError } = await supabase
      .from('mitarbeiter')
      .update({ rolle: rollePreview })
      .eq('id', id);
    setRolleSaving(false);
    if (!dbError) {
      setRolle(rollePreview);
      setRolleSaved(true);
      setTimeout(() => setRolleSaved(false), 3000);
    }
  }

  async function handleDelete() {
    if (!confirm('Mitarbeiter wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
    setDeleting(true);
    await supabase.from('mitarbeiter').delete().eq('id', id);
    router.push('/dashboard/mitarbeiter');
  }

  async function handleVertragSave() {
    setVertragSaving(true);
    const payload = {
      arbeitsmodell: vertrag.arbeitsmodell || null,
      wochenstunden: vertrag.wochenstunden ? parseFloat(vertrag.wochenstunden) : null,
      soll_beginn:   vertrag.soll_beginn || null,
      soll_ende:     vertrag.soll_ende || null,
    };
    const { error: dbError } = await supabase
      .from('mitarbeiter')
      .update(payload)
      .eq('id', id);
    setVertragSaving(false);
    if (!dbError) {
      setVertragSaved(true);
      setTimeout(() => setVertragSaved(false), 3000);
    }
  }

  async function handleNeuEintrag(e) {
    e.preventDefault();
    if (!neuForm.datum) return;
    setNeuSaving(true);
    const payload = {
      company_id:     companyId,
      mitarbeiter_id: id,
      datum:          neuForm.datum,
      beginn:         neuForm.beginn || null,
      ende:           neuForm.ende || null,
      pause_minuten:  parseInt(neuForm.pause_minuten) || 0,
      typ:            neuForm.typ,
      notiz:          neuForm.notiz.trim() || null,
    };
    const { data: newRow, error: dbError } = await supabase
      .from('arbeitszeiten')
      .insert(payload)
      .select()
      .single();
    setNeuSaving(false);
    if (!dbError && newRow) {
      setEintraege(prev => [...prev, newRow].sort((a, b) => a.datum.localeCompare(b.datum)));
      setNeuForm({ datum: '', beginn: '', ende: '', pause_minuten: '0', typ: 'arbeit', notiz: '' });
      setNeuShown(false);
    }
  }

  async function handleDeleteAz(azId) {
    if (!confirm('Eintrag löschen?')) return;
    setDeletingAzId(azId);
    await supabase.from('arbeitszeiten').delete().eq('id', azId);
    setEintraege(prev => prev.filter(e => e.id !== azId));
    setDeletingAzId(null);
  }

  function prevMonat() {
    if (azMonat === 1) { setAzJahr(y => y - 1); setAzMonat(12); }
    else setAzMonat(m => m - 1);
  }

  function nextMonat() {
    if (azMonat === 12) { setAzJahr(y => y + 1); setAzMonat(1); }
    else setAzMonat(m => m + 1);
  }

  async function handleAnspruchSave() {
    setAnspruchSaving(true);
    const { error: dbError } = await supabase
      .from('mitarbeiter')
      .update({ urlaubsanspruch: parseInt(urlaubsanspruch) || null })
      .eq('id', id);
    setAnspruchSaving(false);
    if (!dbError) {
      setAnspruchSaved(true);
      setTimeout(() => setAnspruchSaved(false), 3000);
    }
  }

  async function handleNeuAbwesenheit(e) {
    e.preventDefault();
    if (!uaNeuForm.von) return;
    setUaNeuSaving(true);

    const vonDate = new Date(uaNeuForm.von + 'T00:00:00');
    const bisDate = uaNeuForm.bis
      ? new Date(uaNeuForm.bis + 'T00:00:00')
      : new Date(uaNeuForm.von + 'T00:00:00');

    const rows = [];
    const cur = new Date(vonDate);
    while (cur <= bisDate) {
      const wd = cur.getDay();
      const isWE = wd === 0 || wd === 6;
      if (!uaNeuForm.skipWE || !isWE) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        rows.push({
          company_id:     companyId,
          mitarbeiter_id: id,
          datum:          `${y}-${m}-${d}`,
          typ:            uaNeuForm.typ,
          notiz:          uaNeuForm.notiz.trim() || null,
        });
      }
      cur.setDate(cur.getDate() + 1);
    }

    if (rows.length > 0) {
      const { data: newRows } = await supabase
        .from('arbeitszeiten')
        .insert(rows)
        .select();
      if (newRows) {
        const inThisYear = newRows.filter(r => r.datum.startsWith(String(uaJahr)));
        setAbwesenheiten(prev =>
          [...prev, ...inThisYear].sort((a, b) => a.datum.localeCompare(b.datum))
        );
      }
    }

    setUaNeuSaving(false);
    setUaNeuForm({ von: '', bis: '', typ: 'urlaub', notiz: '', skipWE: true });
    setUaNeuShown(false);
  }

  async function handleDeleteUa(uaId) {
    if (!confirm('Eintrag löschen?')) return;
    setDeletingUaId(uaId);
    await supabase.from('arbeitszeiten').delete().eq('id', uaId);
    setAbwesenheiten(prev => prev.filter(e => e.id !== uaId));
    setDeletingUaId(null);
  }

  function prevJahr() { setUaJahr(y => y - 1); }
  function nextJahr() { setUaJahr(y => y + 1); }

  async function handleNeuZertifikat(e) {
    e.preventDefault();
    if (!zertForm.name.trim()) return;
    setZertNeuSaving(true);
    const payload = {
      company_id:        companyId,
      mitarbeiter_id:    id,
      name:              zertForm.name.trim(),
      ausstellende_stelle: zertForm.ausstellende_stelle.trim() || null,
      ausgestellt_am:    zertForm.ausgestellt_am || null,
      gueltig_bis:       zertForm.gueltig_bis || null,
      notiz:             zertForm.notiz.trim() || null,
    };
    const { data: newRow, error: dbError } = await supabase
      .from('zertifikate')
      .insert(payload)
      .select()
      .single();
    setZertNeuSaving(false);
    if (!dbError && newRow) {
      setZertifikate(prev => [...prev, newRow].sort((a, b) => {
        if (!a.gueltig_bis && !b.gueltig_bis) return 0;
        if (!a.gueltig_bis) return 1;
        if (!b.gueltig_bis) return -1;
        return a.gueltig_bis.localeCompare(b.gueltig_bis);
      }));
      setZertForm({ name: '', ausstellende_stelle: '', ausgestellt_am: '', gueltig_bis: '', notiz: '' });
      setZertNeuShown(false);
    }
  }

  async function handleDeleteZert(zertId) {
    if (!confirm('Zertifikat löschen?')) return;
    setDeletingZertId(zertId);
    await supabase.from('zertifikate').delete().eq('id', zertId);
    setZertifikate(prev => prev.filter(z => z.id !== zertId));
    setDeletingZertId(null);
  }

  function zertStatus(gueltigBis) {
    if (!gueltigBis) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(gueltigBis + 'T00:00:00');
    const diff = Math.round((exp - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: 'Abgelaufen', cls: 'bg-red-50 text-red-600' };
    if (diff <= 30) return { label: `Läuft ab in ${diff}d`, cls: 'bg-amber-50 text-amber-600' };
    if (diff <= 90) return { label: `Läuft ab in ${diff}d`, cls: 'bg-yellow-50 text-yellow-700' };
    return { label: 'Gültig', cls: 'bg-emerald-50 text-emerald-700' };
  }

  if (loading || !form) return (
    <div className="flex items-center justify-center h-48">
      <p className="text-gray-400 text-sm">Lädt…</p>
    </div>
  );

  const fullName = `${form.vorname} ${form.nachname}`.trim() || 'Unbekannt';
  const activeRolle = rollePreview;

  // Derived Monatsauswertung (Arbeitszeiten tab)
  const istMinuten = eintraege
    .filter(e => e.typ === 'arbeit')
    .reduce((sum, e) => sum + (nettoMinuten(e) ?? 0), 0);
  const urlaubstage = eintraege.filter(e => e.typ === 'urlaub').length;
  const kranktage   = eintraege.filter(e => e.typ === 'krank').length;
  const sollH       = sollStundenImMonat(azJahr, azMonat, vertrag.wochenstunden);
  const sollMinuten = sollH != null ? Math.round(sollH * 60) : null;
  const diffMin     = sollMinuten != null ? istMinuten - sollMinuten : null;

  // Derived Jahresübersicht (Urlaub tab)
  const urlaubGenommen    = abwesenheiten.filter(e => e.typ === 'urlaub').length;
  const anspruchInt       = parseInt(urlaubsanspruch) || 0;
  const urlaubVerbleibend = anspruchInt > 0 ? anspruchInt - urlaubGenommen : null;
  const krankImJahr       = abwesenheiten.filter(e => e.typ === 'krank').length;
  const feiertageImJahr   = abwesenheiten.filter(e => e.typ === 'feiertag').length;
  const sonstigesImJahr   = abwesenheiten.filter(e => e.typ === 'sonstiges').length;

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/mitarbeiter" className="text-gray-400 hover:text-gray-600 transition">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
            {(form.vorname?.[0] ?? '?').toUpperCase()}{(form.nachname?.[0] ?? '').toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{fullName}</h1>
            {form.position && <p className="text-sm text-gray-400">{form.position}</p>}
          </div>
        </div>
      </div>

      {/* Tab-Navigation */}
      <div className="flex gap-1 mb-6 border-b border-gray-100 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              tab === t.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Stammdaten */}
      {tab === 'stammdaten' && (
        <form onSubmit={handleSave} className="space-y-6">
          {FELDER.map(({ section, fields }) => (
            <div key={section} className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">{section}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fields.map(({ name, label, type, required }) => (
                  <div key={name}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
                    </label>
                    <input
                      type={type}
                      name={name}
                      value={form[name]}
                      onChange={handleChange}
                      step={type === 'number' ? '0.01' : undefined}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Notizen</h2>
            <textarea
              name="notizen"
              value={form.notizen}
              onChange={handleChange}
              rows={4}
              placeholder="Interne Notizen…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {saving ? 'Speichert…' : 'Speichern'}
              </button>
              {saved && (
                <span className="text-sm text-green-600 font-medium">Gespeichert</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm text-red-400 hover:text-red-600 transition"
            >
              {deleting ? 'Löscht…' : 'Mitarbeiter löschen'}
            </button>
          </div>
        </form>
      )}

      {/* Tab: Rollen & Rechte */}
      {tab === 'rollen' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">System-Rolle</h2>
            <p className="text-xs text-gray-400 mb-4">Legt fest, welche Rechte dieser Mitarbeiter im System erhält.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLE_ORDER.map(r => {
                const isSelected = activeRolle === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRollePreview(r)}
                    className={`text-left p-4 rounded-xl border-2 transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[r]}`}>
                        {ROLE_LABELS[r]}
                      </span>
                      {isSelected && (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-500">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{ROLE_DESCRIPTIONS[r]}</p>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setRollePreview(null)}
              className={`mt-3 w-full text-left px-4 py-3 rounded-xl border-2 transition text-sm ${
                activeRolle === null
                  ? 'border-gray-300 bg-gray-50 text-gray-700'
                  : 'border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600'
              }`}
            >
              Keine Rolle zugewiesen
            </button>

            <div className="flex items-center gap-3 mt-5">
              <button
                type="button"
                onClick={handleRolleSave}
                disabled={rolleSaving || rollePreview === rolle}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 transition"
              >
                {rolleSaving ? 'Speichert…' : 'Rolle speichern'}
              </button>
              {rolleSaved && (
                <span className="text-sm text-green-600 font-medium">Gespeichert</span>
              )}
              {rollePreview !== rolle && !rolleSaving && !rolleSaved && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">Ungespeicherte Änderung</span>
              )}
            </div>
          </div>

          {activeRolle && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-1">
                Berechtigungen —{' '}
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[activeRolle]}`}>
                  {ROLE_LABELS[activeRolle]}
                </span>
              </h2>
              <p className="text-xs text-gray-400 mb-4">Übersicht der Rechte für diese Rolle.</p>
              <div className="space-y-4">
                {PERM_GROUPS.map(group => {
                  const granted = group.perms.filter(p => roleHasPermission(activeRolle, p));
                  if (granted.length === 0) return null;
                  return (
                    <div key={group.label}>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{group.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.perms.map(p => {
                          const has = roleHasPermission(activeRolle, p);
                          return (
                            <span
                              key={p}
                              className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                                has
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-gray-50 text-gray-300'
                              }`}
                            >
                              {has ? '✓ ' : ''}{PERM_LABELS[p] ?? p}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-50">
                Vollständige Berechtigungsmatrix unter{' '}
                <Link href="/dashboard/einstellungen/rollen" className="text-blue-600 hover:underline">
                  Einstellungen → Rollen & Rechte
                </Link>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Arbeitszeiten */}
      {tab === 'arbeitszeiten' && (
        <div className="space-y-5">

          {/* Vertrag & Sollzeit */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">Vertrag & Sollzeit</h2>
            <p className="text-xs text-gray-400 mb-4">Arbeitsmodell und wöchentliche Soll-Stunden für die Monatsauswertung.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Arbeitsmodell</label>
                <div className="flex gap-2">
                  {ARBEITSMODELL_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setVertrag(v => ({ ...v, arbeitsmodell: opt.value }))}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition ${
                        vertrag.arbeitsmodell === opt.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Wochenstunden</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  step="0.5"
                  value={vertrag.wochenstunden}
                  onChange={e => setVertrag(v => ({ ...v, wochenstunden: e.target.value }))}
                  placeholder="z. B. 40"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Arbeitsbeginn (Soll)</label>
                <input
                  type="time"
                  value={vertrag.soll_beginn}
                  onChange={e => setVertrag(v => ({ ...v, soll_beginn: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Arbeitsende (Soll)</label>
                <input
                  type="time"
                  value={vertrag.soll_ende}
                  onChange={e => setVertrag(v => ({ ...v, soll_ende: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5">
              <button
                type="button"
                onClick={handleVertragSave}
                disabled={vertragSaving}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {vertragSaving ? 'Speichert…' : 'Speichern'}
              </button>
              {vertragSaved && (
                <span className="text-sm text-green-600 font-medium">Gespeichert</span>
              )}
            </div>
          </div>

          {/* Monatsnavigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonat}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-800">
              {MONAT_NAMEN[azMonat - 1]} {azJahr}
            </span>
            <button
              type="button"
              onClick={nextMonat}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Monatsauswertung */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Monatsauswertung</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Ist-Stunden</p>
                <p className="text-lg font-bold text-gray-800">{formatStunden(istMinuten)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Soll-Stunden</p>
                <p className="text-lg font-bold text-gray-800">
                  {sollH != null ? formatStunden(Math.round(sollH * 60)) : '—'}
                </p>
              </div>
              <div className={`rounded-xl p-4 ${
                diffMin == null ? 'bg-gray-50' :
                diffMin >= 0 ? 'bg-emerald-50' : 'bg-red-50'
              }`}>
                <p className="text-xs text-gray-400 mb-1">Differenz</p>
                <p className={`text-lg font-bold ${
                  diffMin == null ? 'text-gray-800' :
                  diffMin >= 0 ? 'text-emerald-700' : 'text-red-600'
                }`}>
                  {diffMin != null ? (diffMin >= 0 ? '+' : '') + formatStunden(diffMin) : '—'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Arbeitstage</p>
                <p className="text-lg font-bold text-gray-800">
                  {eintraege.filter(e => e.typ === 'arbeit').length}
                </p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Urlaubstage</p>
                <p className="text-lg font-bold text-green-700">{urlaubstage}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Kranktage</p>
                <p className="text-lg font-bold text-red-600">{kranktage}</p>
              </div>
            </div>
          </div>

          {/* Zeiterfassung */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Zeiterfassung</h2>
              <button
                type="button"
                onClick={() => setNeuShown(s => !s)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Eintrag hinzufügen
              </button>
            </div>

            {/* Neu-Formular */}
            {neuShown && (
              <form onSubmit={handleNeuEintrag} className="mb-5 p-4 bg-gray-50 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Datum <span className="text-red-400">*</span></label>
                    <input
                      type="date"
                      required
                      value={neuForm.datum}
                      onChange={e => setNeuForm(f => ({ ...f, datum: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Typ</label>
                    <select
                      value={neuForm.typ}
                      onChange={e => setNeuForm(f => ({ ...f, typ: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      {Object.entries(TYP_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Beginn</label>
                    <input
                      type="time"
                      value={neuForm.beginn}
                      onChange={e => setNeuForm(f => ({ ...f, beginn: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ende</label>
                    <input
                      type="time"
                      value={neuForm.ende}
                      onChange={e => setNeuForm(f => ({ ...f, ende: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Pause (Min.)</label>
                    <input
                      type="number"
                      min="0"
                      value={neuForm.pause_minuten}
                      onChange={e => setNeuForm(f => ({ ...f, pause_minuten: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notiz</label>
                    <input
                      type="text"
                      value={neuForm.notiz}
                      onChange={e => setNeuForm(f => ({ ...f, notiz: e.target.value }))}
                      placeholder="Optional…"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={neuSaving || !neuForm.datum}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {neuSaving ? 'Speichert…' : 'Speichern'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNeuShown(false)}
                    className="px-4 py-2 text-xs font-medium text-gray-500 rounded-lg hover:bg-gray-100 transition"
                  >
                    Abbrechen
                  </button>
                </div>
              </form>
            )}

            {/* Einträge Liste */}
            {azLaden ? (
              <p className="text-sm text-gray-400 py-4 text-center">Lädt…</p>
            ) : eintraege.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">Keine Einträge für diesen Monat.</p>
            ) : (
              <div className="space-y-2">
                {eintraege.map(e => {
                  const netto = nettoMinuten(e);
                  return (
                    <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition group">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${TYP_COLORS[e.typ] ?? 'bg-gray-50 text-gray-600'}`}>
                        {TYP_LABELS[e.typ] ?? e.typ}
                      </span>
                      <span className="text-xs text-gray-500 shrink-0 w-20">{formatDatum(e.datum)}</span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {e.beginn && e.ende ? `${e.beginn.slice(0,5)} – ${e.ende.slice(0,5)}` : '—'}
                        {e.pause_minuten > 0 && ` (${e.pause_minuten} Min. Pause)`}
                      </span>
                      <span className="text-xs font-semibold text-gray-700 ml-auto shrink-0">
                        {e.typ === 'arbeit' && netto != null ? formatStunden(netto) : ''}
                      </span>
                      {e.notiz && (
                        <span className="text-xs text-gray-400 italic truncate max-w-24 hidden sm:block">{e.notiz}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteAz(e.id)}
                        disabled={deletingAzId === e.id}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 transition shrink-0"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Urlaub & Abwesenheiten */}
      {tab === 'urlaub' && (
        <div className="space-y-5">

          {/* Urlaubsanspruch */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-1">Urlaubsanspruch</h2>
            <p className="text-xs text-gray-400 mb-4">Jährlicher Urlaubsanspruch in Werktagen.</p>
            <div className="flex items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tage pro Jahr</label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={urlaubsanspruch}
                  onChange={e => setUrlaubsanspruch(e.target.value)}
                  className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="button"
                onClick={handleAnspruchSave}
                disabled={anspruchSaving}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {anspruchSaving ? 'Speichert…' : 'Speichern'}
              </button>
              {anspruchSaved && (
                <span className="text-sm text-green-600 font-medium">Gespeichert</span>
              )}
            </div>
          </div>

          {/* Jahresnavigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={prevJahr}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-800">{uaJahr}</span>
            <button
              type="button"
              onClick={nextJahr}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Jahresübersicht */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Jahresübersicht {uaJahr}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Anspruch</p>
                <p className="text-lg font-bold text-gray-800">
                  {anspruchInt > 0 ? `${anspruchInt} Tage` : '—'}
                </p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Genommen</p>
                <p className="text-lg font-bold text-green-700">{urlaubGenommen} Tage</p>
              </div>
              <div className={`rounded-xl p-4 ${
                urlaubVerbleibend == null ? 'bg-gray-50' :
                urlaubVerbleibend >= 0 ? 'bg-emerald-50' : 'bg-red-50'
              }`}>
                <p className="text-xs text-gray-400 mb-1">Verbleibend</p>
                <p className={`text-lg font-bold ${
                  urlaubVerbleibend == null ? 'text-gray-800' :
                  urlaubVerbleibend >= 0 ? 'text-emerald-700' : 'text-red-600'
                }`}>
                  {urlaubVerbleibend != null ? `${urlaubVerbleibend} Tage` : '—'}
                </p>
              </div>
              <div className="bg-red-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Kranktage</p>
                <p className="text-lg font-bold text-red-600">{krankImJahr} Tage</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Feiertage</p>
                <p className="text-lg font-bold text-purple-700">{feiertageImJahr} Tage</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Sonstiges</p>
                <p className="text-lg font-bold text-gray-600">{sonstigesImJahr} Tage</p>
              </div>
            </div>
          </div>

          {/* Abwesenheitsliste */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Abwesenheiten</h2>
              <button
                type="button"
                onClick={() => setUaNeuShown(s => !s)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Eintragen
              </button>
            </div>

            {/* Neu-Formular */}
            {uaNeuShown && (
              <form onSubmit={handleNeuAbwesenheit} className="mb-5 p-4 bg-gray-50 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Von <span className="text-red-400">*</span></label>
                    <input
                      type="date"
                      required
                      value={uaNeuForm.von}
                      onChange={e => setUaNeuForm(f => ({ ...f, von: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Bis <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input
                      type="date"
                      min={uaNeuForm.von}
                      value={uaNeuForm.bis}
                      onChange={e => setUaNeuForm(f => ({ ...f, bis: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Typ</label>
                    <select
                      value={uaNeuForm.typ}
                      onChange={e => setUaNeuForm(f => ({ ...f, typ: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      {UA_TYP_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notiz</label>
                    <input
                      type="text"
                      value={uaNeuForm.notiz}
                      onChange={e => setUaNeuForm(f => ({ ...f, notiz: e.target.value }))}
                      placeholder="Optional…"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                </div>
                {uaNeuForm.bis && (uaNeuForm.typ === 'urlaub' || uaNeuForm.typ === 'krank') && (
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={uaNeuForm.skipWE}
                      onChange={e => setUaNeuForm(f => ({ ...f, skipWE: e.target.checked }))}
                      className="rounded"
                    />
                    Wochenenden überspringen
                  </label>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={uaNeuSaving || !uaNeuForm.von}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {uaNeuSaving ? 'Speichert…' : 'Speichern'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUaNeuShown(false)}
                    className="px-4 py-2 text-xs font-medium text-gray-500 rounded-lg hover:bg-gray-100 transition"
                  >
                    Abbrechen
                  </button>
                </div>
              </form>
            )}

            {/* Abwesenheitsliste */}
            {uaLaden ? (
              <p className="text-sm text-gray-400 py-4 text-center">Lädt…</p>
            ) : abwesenheiten.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">Keine Abwesenheiten für {uaJahr}.</p>
            ) : (
              <div className="space-y-2">
                {abwesenheiten.map(e => (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition group">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${TYP_COLORS[e.typ] ?? 'bg-gray-50 text-gray-600'}`}>
                      {TYP_LABELS[e.typ] ?? e.typ}
                    </span>
                    <span className="text-xs text-gray-600 shrink-0 w-24">{formatDatum(e.datum)}</span>
                    {e.notiz && (
                      <span className="text-xs text-gray-400 italic truncate">{e.notiz}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteUa(e.id)}
                      disabled={deletingUaId === e.id}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 transition shrink-0 ml-auto"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Zertifikate & Schulungen */}
      {tab === 'zertifikate' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-700">Zertifikate & Schulungen</h2>
                <p className="text-xs text-gray-400 mt-0.5">Qualifikationen, Lizenzen und Weiterbildungen.</p>
              </div>
              <button
                type="button"
                onClick={() => setZertNeuShown(s => !s)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Hinzufügen
              </button>
            </div>

            {/* Neu-Formular */}
            {zertNeuShown && (
              <form onSubmit={handleNeuZertifikat} className="mb-5 p-4 bg-gray-50 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Name / Bezeichnung <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      required
                      value={zertForm.name}
                      onChange={e => setZertForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="z. B. Führerschein Klasse B, Erste-Hilfe-Kurs…"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ausstellende Stelle</label>
                    <input
                      type="text"
                      value={zertForm.ausstellende_stelle}
                      onChange={e => setZertForm(f => ({ ...f, ausstellende_stelle: e.target.value }))}
                      placeholder="z. B. TÜV, DEKRA…"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ausgestellt am</label>
                    <input
                      type="date"
                      value={zertForm.ausgestellt_am}
                      onChange={e => setZertForm(f => ({ ...f, ausgestellt_am: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Gültig bis</label>
                    <input
                      type="date"
                      value={zertForm.gueltig_bis}
                      onChange={e => setZertForm(f => ({ ...f, gueltig_bis: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notiz</label>
                    <input
                      type="text"
                      value={zertForm.notiz}
                      onChange={e => setZertForm(f => ({ ...f, notiz: e.target.value }))}
                      placeholder="Optional…"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={zertNeuSaving || !zertForm.name.trim()}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {zertNeuSaving ? 'Speichert…' : 'Speichern'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setZertNeuShown(false)}
                    className="px-4 py-2 text-xs font-medium text-gray-500 rounded-lg hover:bg-gray-100 transition"
                  >
                    Abbrechen
                  </button>
                </div>
              </form>
            )}

            {/* Liste */}
            {zertLaden ? (
              <p className="text-sm text-gray-400 py-4 text-center">Lädt…</p>
            ) : zrtifikate.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">Noch keine Zertifikate hinterlegt.</p>
            ) : (
              <div className="space-y-2">
                {zertifikate.map(z => {
                  const status = zertStatus(z.gueltig_bis);
                  return (
                    <div key={z.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition group">
                      {/* Icon */}
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-blue-600">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.745 3.745 0 013.296-1.043A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                        </svg>
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-800">{z.name}</span>
                          {status && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cls}`}>
                              {status.label}
                            </span>
                          )}
                          {!z.gueltig_bis && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-50 text-gray-400">Unbefristet</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {z.ausstellende_stelle && (
                            <span className="text-xs text-gray-400">{z.ausstellende_steelle}</span>
                          )}
                          {z.ausgestellt_am && (
                            <span className="text-xs text-gray-400">Ausgestellt: {new Date(z.ausgestellt_am + 'T00:00:00').toLocaleDateString('de-DE')}</span>
                          )}
                          {z.gueltig_bis && (
                            <span className="text-xs text-gray-400">Gøltig bis: {new Date(z.gueltig_bis + 'T00:00:00').toLocaleDateString('de-DE')}</span>
                          )}
                        </div>
                        {z.notiz && (
                          <p className="text-xs text-gray-400 italic mt-0.5">{z.notiz}</p>
                        )}
                      </div>
                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteZert(z.id)}
                        disabled={deletingZertId === z.id}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 transition shrink-0 mt-0.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Tab: Fahrzeuge */}
      {tab === 'fahrzeuge' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center justify-center h-40">
          <p className="text-sm text-gray-400">Kommt bald.</p>
        </div>
      )}
    </div>
  );
}
