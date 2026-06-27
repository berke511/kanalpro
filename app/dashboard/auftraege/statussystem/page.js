'use client';

const STATUS_LIST = [
  { key: 'neu',           label: 'Neu',           farbe: 'bg-gray-100 text-gray-600 border-gray-200',       dot: 'bg-gray-400'    },
  { key: 'geplant',       label: 'Geplant',        farbe: 'bg-blue-50 text-blue-700 border-blue-200',        dot: 'bg-blue-500'    },
  { key: 'zugewiesen',    label: 'Zugewiesen',     farbe: 'bg-indigo-50 text-indigo-700 border-indigo-200',  dot: 'bg-indigo-500'  },
  { key: 'unterwegs',     label: 'Unterwegs',      farbe: 'bg-cyan-50 text-cyan-700 border-cyan-200',        dot: 'bg-cyan-500'    },
  { key: 'vor_ort',       label: 'Vor Ort',        farbe: 'bg-teal-50 text-teal-700 border-teal-200',        dot: 'bg-teal-500'    },
  { key: 'in_arbeit',     label: 'In Arbeit',      farbe: 'bg-amber-50 text-amber-700 border-amber-200',     dot: 'bg-amber-500'   },
  { key: 'wartend',       label: 'Wartend',        farbe: 'bg-orange-50 text-orange-700 border-orange-200',  dot: 'bg-orange-400'  },
  { key: 'fertig',        label: 'Fertig',         farbe: 'bg-green-50 text-green-700 border-green-200',     dot: 'bg-green-500'   },
  { key: 'abgeschlossen', label: 'Abgeschlossen',  farbe: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  { key: 'storniert',     label: 'Storniert',      farbe: 'bg-red-50 text-red-600 border-red-200',           dot: 'bg-red-400'     },
];

export default function Statussystem() {
  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-xl font-bold text-gray-900">Statussystem</h1>
        <p className="text-sm text-gray-500 mt-0.5">Verwalte alle Auftragsstatus.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <span className="text-sm font-semibold text-gray-900">Verfügbare Status</span>
          <span className="ml-2 text-xs text-gray-400">{STATUS_LIST.length} Status definiert</span>
        </div>
        <div className="divide-y divide-gray-50">
          {STATUS_LIST.map((s, i) => (
            <div key={s.key} className="px-6 py-4 flex items-center gap-4">
              <span className="text-xs text-gray-300 w-5 shrink-0 text-right">{i + 1}</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${s.farbe} shrink-0`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {s.label}
              </span>
              <code className="text-xs text-gray-300 font-mono">{s.key}</code>
              <span className="flex-1" />
              <span className="text-xs text-gray-200 italic">Logik folgt</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24"
          strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-xs text-blue-700">
          Status-Übergänge, Berechtigungen und Automatisierungen werden im nächsten Sprint implementiert.
        </p>
      </div>

    </div>
  );
}
