'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { User, Building2, FileText, Wrench } from 'lucide-react';
import {
  PageHeader, Card,
  FormInput, FormTextarea, FormCheckbox,
  FormSection, FormFooter, FormError, SuccessBanner,
  PrimaryButton, SecondaryButton,
} from '@/components/ui/KanalProUI';

export default function NeuerKunde() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', telefon: '', email: '', adresse: '', notizen: '',
    kundentyp: 'privat', firmenname: '',
    rechnungsadresse_abweichend: false,
    rechnung_strasse: '', rechnung_plz: '', rechnung_ort: '',
    ist_vertragskunde: false, ist_wartungskunde: false,
  });
  const [errors, setErrors] = useState({});
  const [apiErr, setApiErr] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function setField(key) {
    return e => {
      setForm(prev => ({ ...prev, [key]: e.target.value }));
      if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
    };
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Name ist erforderlich.';
    if (form.kundentyp === 'firma' && !form.firmenname.trim()) e.firmenname = 'Firmenname ist erforderlich.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setApiErr('');
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('kunden').insert({
      name: form.name,
      telefon: form.telefon || null,
      email: form.email || null,
      adresse: form.adresse || null,
      notizen: form.notizen || null,
      kundentyp: form.kundentyp,
      firmenname: form.kundentyp === 'firma' ? (form.firmenname || null) : null,
      rechnungsadresse_abweichend: form.rechnungsadresse_abweichend,
      rechnung_strasse: form.rechnungsadresse_abweichend ? (form.rechnung_strasse || null) : null,
      rechnung_plz: form.rechnungsadresse_abweichend ? (form.rechnung_plz || null) : null,
      rechnung_ort: form.rechnungsadresse_abweichend ? (form.rechnung_ort || null) : null,
      ist_vertragskunde: form.ist_vertragskunde,
      ist_wartungskunde: form.ist_wartungskunde,
      user_id: user.id,
    });
    if (error) {
      setApiErr('Fehler beim Speichern. Bitte erneut versuchen.');
      setIsSaving(false);
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push('/dashboard/kunden'), 1500);
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Neuer Kunde" subtitle="Kundendaten eingeben und speichern" />

      {success && <SuccessBanner message="Kunde wurde erfolgreich angelegt. Weiterleitung..." />}

      {apiErr && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-400">
          {apiErr}
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit}>

          <FormSection title="Kundentyp">
            <div className="flex gap-3">
              {[
                { value: 'privat', Icon: User, label: 'Privatperson' },
                { value: 'firma', Icon: Building2, label: 'Firmenkunde' },
              ].map(opt => (
                <label key={opt.value} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition ${
                  form.kundentyp === opt.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400'
                }`}>
                  <input type="radio" name="kundentyp" value={opt.value}
                    checked={form.kundentyp === opt.value} onChange={handleChange} className="hidden" />
                  <opt.Icon size={18} />
                  <span className="text-sm font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
          </FormSection>

          <FormSection title="Stammdaten">
            <div className={form.kundentyp === 'firma' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}>
              <div>
                <FormInput
                  label={form.kundentyp === 'firma' ? 'Ansprechpartner *' : 'Name *'}
                  id="name" required value={form.name} onChange={setField('name')}
                  placeholder="Max Mustermann"
                />
                {errors.name && <FormError>{errors.name}</FormError>}
              </div>
              {form.kundentyp === 'firma' && (
                <div>
                  <FormInput label="Firmenname *" id="firmenname" required
                    value={form.firmenname} onChange={setField('firmenname')}
                    placeholder="Mustermann GmbH"
                  />
                  {errors.firmenname && <FormError>{errors.firmenname}</FormError>}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput label="Telefon" id="telefon" type="tel"
                value={form.telefon} onChange={setField('telefon')} placeholder="+49 211 123456" />
              <FormInput label="E-Mail" id="email" type="email"
                value={form.email} onChange={setField('email')} placeholder="kunde@beispiel.de" />
            </div>
            <FormInput label="Adresse (Einsatzort / Lieferadresse)" id="adresse"
              value={form.adresse} onChange={setField('adresse')}
              placeholder="Musterstrasse 1, 40000 Duesseldorf" />
          </FormSection>

          <FormSection title="Rechnungsadresse">
            <FormCheckbox
              id="rechnungsadresse_abweichend"
              checked={form.rechnungsadresse_abweichend}
              onChange={e => setForm(p => ({ ...p, rechnungsadresse_abweichend: e.target.checked }))}
              label="Rechnungsadresse weicht von Einsatzort ab"
            />
            {form.rechnungsadresse_abweichend && (
              <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 space-y-3">
                <FormInput label="Strasse" id="rechnung_strasse"
                  value={form.rechnung_strasse} onChange={setField('rechnung_strasse')}
                  placeholder="Rechnungsstrasse 5" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <FormInput label="PLZ" id="rechnung_plz"
                    value={form.rechnung_plz} onChange={setField('rechnung_plz')} placeholder="40000" />
                  <div className="md:col-span-2">
                    <FormInput label="Ort" id="rechnung_ort"
                      value={form.rechnung_ort} onChange={setField('rechnung_ort')} placeholder="Duesseldorf" />
                  </div>
                </div>
              </div>
            )}
          </FormSection>

          <FormSection title="Kundenstatus">
            <div className="flex gap-6 flex-wrap">
              <label className="flex items-center gap-2.5 cursor-pointer select-none min-h-[44px]">
                <input type="checkbox" name="ist_vertragskunde" checked={form.ist_vertragskunde}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <FileText size={18} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Vertragskunde</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer select-none min-h-[44px]">
                <input type="checkbox" name="ist_wartungskunde" checked={form.ist_wartungskunde}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <Wrench size={18} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Wartungskunde</span>
              </label>
            </div>
          </FormSection>

          <FormSection title="Notizen">
            <FormTextarea id="notizen" value={form.notizen} onChange={setField('notizen')}
              placeholder="Interne Notizen..." rows={3} />
          </FormSection>

          <FormFooter>
            <SecondaryButton type="button" onClick={() => router.back()}>Abbrechen</SecondaryButton>
            <PrimaryButton type="submit" disabled={isSaving}>
              {isSaving ? 'Speichern...' : 'Kunde speichern'}
            </PrimaryButton>
          </FormFooter>

        </form>
      </Card>
    </div>
  );
}
