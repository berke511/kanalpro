// Leichte, abhängigkeitsfreie SVG-/CSS-Diagramme für die Angebots-/
// Rechnungsstatistiken (Spec-Punkt 11). Es gibt keine Charting-Bibliothek
// (z. B. recharts) in diesem Projekt – bewusst keine neue Abhängigkeit
// eingeführt, stattdessen einfache, serverseitig renderbare Bausteine.

export function VerticalBarChart({
  data,
  formatValue,
  height = 160,
}: {
  data: Array<{ label: string; value: number }>;
  formatValue: (v: number) => string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barWidth = 100 / Math.max(1, data.length);

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="h-40 w-full overflow-visible">
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 24);
          const x = i * barWidth;
          return (
            <g key={d.label}>
              <rect x={x + barWidth * 0.18} y={height - 24 - h} width={barWidth * 0.64} height={Math.max(h, d.value > 0 ? 1.5 : 0)} rx={1.5} className="fill-brand" />
            </g>
          );
        })}
      </svg>
      <div className="mt-1.5 flex text-[10px] text-muted">
        {data.map((d) => (
          <div key={d.label} style={{ width: `${barWidth}%` }} className="truncate text-center">
            {d.label}
          </div>
        ))}
      </div>
      <div className="mt-1 flex text-[10px] font-medium text-foreground">
        {data.map((d) => (
          <div key={d.label} style={{ width: `${barWidth}%` }} className="truncate text-center">
            {formatValue(d.value)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HorizontalBarList({
  data,
  formatValue,
}: {
  data: Array<{ label: string; value: number }>;
  formatValue: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2.5">
      {data.length === 0 && <p className="text-xs text-muted">Keine Daten vorhanden.</p>}
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex items-center justify-between text-xs">
            <span className="truncate font-medium text-foreground">{d.label}</span>
            <span className="shrink-0 text-muted">{formatValue(d.value)}</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-dark" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProgressRing({ percent, label, sublabel }: { percent: number; label: string; sublabel: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-24 w-24 shrink-0 -rotate-90">
        <circle cx="50" cy="50" r={radius} strokeWidth="10" className="fill-none stroke-background" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          strokeWidth="10"
          strokeLinecap="round"
          className="fill-none stroke-brand transition-all"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div>
        <p className="text-2xl font-semibold tracking-tight text-foreground">{clamped.toFixed(0)}%</p>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted">{sublabel}</p>
      </div>
    </div>
  );
}
