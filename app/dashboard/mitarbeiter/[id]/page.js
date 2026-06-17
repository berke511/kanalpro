'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import {
  ROLE_LABELS, ROLE_COLORS, PERMISSIONS, roleHasPermission,
} from '@/lib/roles';

const TABS = [
  { id: 'stammdaten', label: 'Stammdaten' },
  { id: 'rollen',     label: 'Rollen & Rechte' },
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
  const [rollePreview, setRollePreview] = useState(null); // locally selected but not yet saved

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
      setLoading(false);
    }
    load();
  }, [id, router]);

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

  if (loading || !form) return (
    <div className="flex items-center justify-center h-48">
      <p className="text-gray-400 text-sm">Lädt…</p>
    </div>
  );

  const fullName = `${form.vorname} ${form.nachname}`.trim() || 'Unbekannt';
  const activeRolle = rollePreview; // what's shown in the UI

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
      <div className="flex gap-1 mb-6 border-b border-gray-100">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
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

          {/* Rolle wählen */}
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

            {/* Keine Rolle Option */}
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

          {/* Berechtigungsübersicht für gewählte Rolle */}
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
    </div>
  );
}
