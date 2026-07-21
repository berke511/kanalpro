'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import Page from '@/components/ui/v2/Page';
import Card from '@/components/ui/v2/Card';
import Input from '@/components/ui/v2/Input';
import Button from '@/components/ui/v2/Button';

export default function KundeNeuV2Page() {
    var router = useRouter();
    var [form, setForm] = useState({
        name: '',
        firma: '',
        telefon: '',
        email: '',
        adresse: '',
        notizen: '',
        kundentyp: 'privat',
        rechnungsadresse_abweichend: false,
        rechnung_strasse: '',
        rechnung_plz: '',
        rechnung_ort: '',
        ist_vertragskunde: false,
        ist_wartungskunde: false,
    });
    var [errors, setErrors] = useState({});
    var [apiErr, setApiErr] = useState('');
    var [isSaving, setIsSaving] = useState(false);
    var [success, setSuccess] = useState(false);

    function setField(key) {
        return function(e) {
            var val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
            setForm(function(prev) { return Object.assign({}, prev, { [key]: val }); });
            if (errors[key]) setErrors(function(prev) { return Object.assign({}, prev, { [key]: '' }); });
        };
    }

    function validate() {
        var e = {};
        if (!form.name.trim()) e.name = 'Name ist erforderlich.';
        if (form.kundentyp === 'firma' && !form.firma.trim()) e.firma = 'Firmenname ist erforderlich.';
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!validate()) return;
        setApiErr('');
        setIsSaving(true);

        var authResult = await supabase.auth.getUser();
        var user = authResult.data.user;
        if (!user) { setApiErr('Nicht eingeloggt.'); setIsSaving(false); return; }

        var memberResult = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        var member = memberResult.data;
        if (!member) { setApiErr('Kein Unternehmen gefunden.'); setIsSaving(false); return; }

        var insertResult = await supabase.from('kunden').insert({
            name: form.name,
            firma: form.kundentyp === 'firma' ? (form.firma || null) : null,
            firmenname: form.kundentyp === 'firma' ? (form.firma || null) : null,
            telefon: form.telefon || null,
            email: form.email || null,
            adresse: form.adresse || null,
            notizen: form.notizen || null,
            kundentyp: form.kundentyp,
            rechnungsadresse_abweichend: form.rechnungsadresse_abweichend,
            rechnung_strasse: form.rechnungsadresse_abweichend ? (form.rechnung_strasse || null) : null,
            rechnung_plz: form.rechnungsadresse_abweichend ? (form.rechnung_plz || null) : null,
            rechnung_ort: form.rechnungsadresse_abweichend ? (form.rechnung_ort || null) : null,
            ist_vertragskunde: form.ist_vertragskunde,
            ist_wartungskunde: form.ist_wartungskunde,
            company_id: member.company_id,
            user_id: user.id,
        });

        if (insertResult.error) {
            setApiErr('Fehler beim Speichern. Bitte erneut versuchen.');
            setIsSaving(false);
            return;
        }
        setSuccess(true);
        setTimeout(function() { router.push('/dashboard-v2/kunden'); }, 1200);
    }

    return (
        <Page>
          <Page.Header>
            <Page.Title>Neuer Kunde</Page.Title>
            <Page.Description>Kundendaten eingeben und speichern</Page.Description>
          </Page.Header>
          <Page.Content>
            {success && (
              <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                Kunde wurde erfolgreich angelegt. Weiterleitung...
              </div>
            )}
            {apiErr && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {apiErr}
              </div>
            )}
            <Card>
              <Card.Content>
                <form onSubmit={handleSubmit} className="space-y-6">

                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-700">Kundentyp</p>
                    <div className="flex gap-3">
                      <label className={'flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer text-sm ' + (form.kundentyp === 'privat' ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600')}>
                        <input type="radio" name="kundentyp" value="privat" checked={form.kundentyp === 'privat'} onChange={setField('kundentyp')} className="sr-only" />
                        Privatperson
                      </label>
                      <label className={'flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer text-sm ' + (form.kundentyp === 'firma' ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600')}>
                        <input type="radio" name="kundentyp" value="firma" checked={form.kundentyp === 'firma'} onChange={setField('kundentyp')} className="sr-only" />
                        Firmenkunde
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stammdaten</p>
                    <div className={'grid gap-4 ' + (form.kundentyp === 'firma' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}>
                      <Input
                        label={form.kundentyp === 'firma' ? 'Ansprechpartner *' : 'Name *'}
                        id="name"
                        required
                        value={form.name}
                        onChange={setField('name')}
                        placeholder="Max Mustermann"
                        error={errors.name}
                      />
                      {form.kundentyp === 'firma' && (
                        <Input
                          label="Firmenname *"
                          id="firma"
                          required
                          value={form.firma}
                          onChange={setField('firma')}
                          placeholder="Mustermann GmbH"
                          error={errors.firma}
                        />
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input label="Telefon" id="telefon" type="tel" value={form.telefon} onChange={setField('telefon')} placeholder="+49 211 123456" />
                      <Input label="E-Mail" id="email" type="email" value={form.email} onChange={setField('email')} placeholder="kunde@beispiel.de" />
                    </div>
                    <Input label="Adresse" id="adresse" value={form.adresse} onChange={setField('adresse')} placeholder="Musterstraße 1, 40000 Düsseldorf" />
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rechnungsadresse</p>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input type="checkbox" checked={form.rechnungsadresse_abweichend} onChange={setField('rechnungsadresse_abweichend')} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                      Rechnungsadresse weicht vom Einsatzort ab
                    </label>
                    {form.rechnungsadresse_abweichend && (
                      <div className="space-y-3 rounded-lg bg-gray-50 border border-gray-100 p-4">
                        <Input label="Straße" id="rechnung_strasse" value={form.rechnung_strasse} onChange={setField('rechnung_strasse')} placeholder="Rechnungsstraße 5" />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Input label="PLZ" id="rechnung_plz" value={form.rechnung_plz} onChange={setField('rechnung_plz')} placeholder="40000" />
                          <div className="sm:col-span-2">
                            <Input label="Ort" id="rechnung_ort" value={form.rechnung_ort} onChange={setField('rechnung_ort')} placeholder="Düsseldorf" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kundenstatus</p>
                    <div className="flex gap-6 flex-wrap">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                        <input type="checkbox" checked={form.ist_vertragskunde} onChange={setField('ist_vertragskunde')} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                        Vertragskunde
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                        <input type="checkbox" checked={form.ist_wartungskunde} onChange={setField('ist_wartungskunde')} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                        Wartungskunde
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notizen</p>
                    <textarea
                      id="notizen"
                      rows={3}
                      value={form.notizen}
                      onChange={setField('notizen')}
                      placeholder="Interne Notizen..."
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                    <Button type="button" variant="secondary" onClick={function() { router.push('/dashboard-v2/kunden'); }}>
                      Abbrechen
                    </Button>
                    <Button type="submit" variant="primary" disabled={isSaving}>
                      {isSaving ? 'Speichern...' : 'Kunde speichern'}
                    </Button>
                  </div>

                </form>
              </Card.Content>
            </Card>
          </Page.Content>
        </Page>
    );
}
