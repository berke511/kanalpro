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

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('auftraege').select('*, kunden(name)').eq('user_id', user.id).order('erstellt_am', { ascending: false });
      setAuftraege(data ?? []); setLaden(false);
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
          <Link href="/dashboard/auftraege/neu" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm">
            + Neuer Auftrag
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
