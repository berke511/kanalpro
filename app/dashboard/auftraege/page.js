'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import supabase from '@/lib/supabase';
import {
PageHeader,
FilterBar,
FilterButton,
Table,
TableRow,
TableCell,
StatusBadge,
EmptyState,
PrimaryButton,
} from '@/components/ui/KanalProUI';

const filterLabels = {
alle: 'Alle',
offen: 'Offen',
in_bearbeitung: 'In Bearbeitung',
abgeschlossen: 'Abgeschlossen',
};

export default function Auftraege() {
const router = useRouter();
const [auftraege, setAuftraege] = useState([]);
const [filter, setFilter] = useState('alle');
const [laden, setLaden] = useState(true);
const [fehler, setFehler] = useState(null);

useEffect(() => {
async function load() {
const { data: { user } } = await supabase.auth.getUser();

const { data: memberData } = await supabase
.from('company_members')
.select('company_id')
.eq('user_id', user.id)
.single();
const companyId = memberData?.company_id;

if (!companyId) {
setFehler('Dein Benutzer ist keinem Unternehmen zugeordnet.');
setLaden(false);
return;
}

const { data } = await supabase
.from('auftraege')
.select('*, kunden(name)')
.eq('company_id', companyId)
.order('erstellt_am', { ascending: false });

setAuftraege(data ?? []);
setLaden(false);
}
load();
}, []);

const gefiltert = filter === 'alle' ? auftraege : auftraege.filter(a => a.status === filter);

return (
<div>
<PageHeader
title="Auftraege"
subtitle={auftraege.length + ' Auftraege gesamt'}
action={
<Link href="/dashboard/auftraege/neu">
<PrimaryButton>+ Neuer Auftrag</PrimaryButton>
</Link>
}
/>
<div className="mb-5">
<FilterBar>
{['alle', 'offen', 'in_bearbeitung', 'abgeschlossen'].map(s => (
<FilterButton
key={s}
label={filterLabels[s]}
active={filter === s}
onClick={() => setFilter(s)}
/>
))}
</FilterBar>
</div>
{laden ? (
<p className="text-gray-400">Wird geladen...</p>
) : fehler ? (
<p className="text-red-500">{fehler}</p>
) : gefiltert.length === 0 ? (
<EmptyState
icon={ClipboardList}
title="Keine Auftraege"
description="Lege deinen ersten Auftrag an."
/>
) : (
<Table headers={['Titel', 'Kunde', 'Datum', 'Status', '']}>
{gefiltert.map(a => (
<TableRow key={a.id} onClick={() => router.push('/dashboard/auftraege/' + a.id)}>
<TableCell className="font-medium text-gray-900">{a.titel}</TableCell>
<TableCell>{a.kunden?.name ?? '–'}</TableCell>
<TableCell>{a.datum ? new Date(a.datum).toLocaleDateString('de-DE') : '–'}</TableCell>
<TableCell><StatusBadge status={a.status} /></TableCell>
<TableCell className="text-right text-gray-400">→</TableCell>
</TableRow>
))}
</Table>
)}
</div>
);
}
