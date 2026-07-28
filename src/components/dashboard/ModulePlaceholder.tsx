export function ModulePlaceholder({
  title,
  description,
  upcoming,
}: {
  title: string;
  description: string;
  upcoming: string[];
}) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>

      <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <p className="text-sm font-medium text-muted">
          Dieses Modul ist als Nächstes in Arbeit.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Geplanter Funktionsumfang</h2>
        <ul className="mt-3 space-y-2">
          {upcoming.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
