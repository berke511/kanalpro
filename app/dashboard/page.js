'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList, FileText, Receipt, AlertCircle, CalendarDays, TrendingUp,
  CalendarPlus, ClipboardPlus, FilePlus, ReceiptText, UserPlus,
} from 'lucide-react';
import supabase from '@/lib/supabase';

export default function Dashboard() {
  const [kpis, setKpis] = useState({
    offeneAuftraege: null,
    offeneAngebote: null,
    offeneRechnungen: null,
    ueberfaellig: null,
    einsaetze: null,
    umsatz: null,
  });
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const uid = user.id;
      const heute = new Date().toISOString().split('T')[0];
      const jetzt = new Date();
      const ersterTag = new Date(jetzt.getFullYear(), jetzt.getMonth(), 1).toISOString().split('T')[0];
      const letzterTag = new Date(jetzt.getFullYear(), jetzt.getMonth() + 1, 0).toISOString().split('T')[0];

      const [r1, r2, r3, r4, r5, r6] = await Promise.all([
        supabase.from('auftraege').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('status', 'offen'),
        supabase.from('angebote').select('id', { count: 'exact', head: true }).eq('user_id', uid).in('status', ['entwurf', 'gesendet']),
        supabase.from('rechnungen').select('id', { count: 'exact', head: true }).eq('user_id', uid).in('status', ['entwurf', 'gesendet']),
        supabase.from('rechnungen').select('id', { count: 'exact', head: true }).eq('user_id', uid).neq('status', 'bezahlt').lt('faelligkeitsdatum', heute),
        supabase.from('disposition').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('datum', heute),
        supabase.from('rechnungen').select('positionen, steuersatz').eq('user_id', uid).eq('status', 'bezahlt').gte('datum', ersterTag).lte('datum', letzterTag),
      ]);

      let umsatz = null;
      if (!r6.error && r6.data && r6.data.length > 0) {
        umsatz = r6.data.reduce((sum, r) => {
          const netto = (r.positionen ?? []).reduce((s, p) => s + p.menge * p.preis, 0);
          return sum + netto * (1 + (r.steuersatz ?? 19) / 100);
        }, 0);
      }

      setKpis({
        offeneAuftraege:  r1.error ? null : (r1.count ?? null),
        offeneAngebote:   r2.error ? null : (r2.count ?? null),
        offeneRechnungen: r3.error ? null : (r3.count ?? null),
        ueberfaellig:     r4.error ? null : (r4.count ?? null),
        einsaetze:        r5.error ? null : (r5.count ?? null),
        umsatz,
      });
      setLaden(false);
    }
    load();
  }, []);

  const karten = [
    { label: 'Offene Aufträge',       value: kpis.offeneAuftraege,  href: '/dashboard/auftraege',   Icon: ClipboardList, color: 'text-blue-600',    bg: 'bg-blue-50'    },
    { label: 'Offene Angebote',         value: kpis.offeneAngebote,   href: '/dashboard/angebote',    Icon: FileText,      color: 'text-amber-600',   bg: 'bg-amber-50'   },
    { label: 'Offene Rechnungen',       value: kpis.offeneRechnungen, href: '/dashboard/rechnungen',  Icon: Receipt,       color: 'text-violet-600',  bg: 'bg-violet-50'  },
    { label: 'Überfällige Rechnungen', value: kpis.ueberfaellig,     href: '/dashboard/rechnungen',  Icon: AlertCircle,   color: 'text-red-600',     bg: 'bg-red-50'     },
    { label: 'Heute geplante Einsätze', value: kpis.einsaetze,       href: '/dashboard/disposition', Icon: CalendarDays,  color: 'text-green-600',   bg: 'bg-green-50'   },
    { label: 'Umsatz Monat',            value: kpis.umsatz,           href: '/dashboard/rechnungen',  Icon: TrendingUp,    color: 'text-emerald-600', bg: 'bg-emerald-50', currency: true },
  ];

  const schnell = [
    { label: 'Einsatz planen', href: '/dashboard/disposition',         Icon: CalendarPlus  },
    { label: 'Neuer Auftrag',  href: '/dashboard/auftraege/erstellen', Icon: ClipboardPlus },
    { label: 'Neues Angebot',  href: '/dashboard/angebote/neu',        Icon: FilePlus      },
    { label: 'Neue Rechnung',  href: '/dashboard/rechnungen/neu',      Icon: ReceiptText   },
    { label: 'Neuer Kunde',    href: '/dashboard/kunden/neu',          Icon: UserPlus      },
  ];

  function fmt(k) {
    if (laden) return '–';
    if (k.value === null) return 'Noch keine Daten';
    if (k.currency) return k.value.toFixed(2).replace('.', ',') + ' €';
    return k.value;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Übersicht</h1>
        <p className="text-gray-500 mt-1">Willkommen bei KanalPro</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {karten.map((k) => (
          <Link key={k.label} href={k.href}>
            <div className="rounded-2xl border border-gray-100 bg-white p-6 hover:shadow-sm transition-shadow cursor-pointer">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${k.bg} mb-4`}>
                <k.Icon className={`w-5 h-5 ${k.color}`} />
              </div>
              <div className={`font-bold mb-1 ${k.value === null && !laden ? 'text-sm text-gray-400' : 'text-3xl text-gray-900'}`}>
                {fmt(k)}
              </div>
              <div className="text-sm text-gray-500">{k.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-4">Schnellzugriff</h2>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {schnell.map((s) => (
            <Link key={s.label} href={s.href}>
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer min-w-[100px]">
                <s.Icon className="w-5 h-5 text-gray-500" />
                <span className="text-xs font-medium text-gray-600 text-center">{s.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
