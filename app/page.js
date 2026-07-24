import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ───────── NAVBAR ───────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center">
              <Image src="/logo.png" alt="KanalPro" width={36} height={36} className="object-cover scale-125" />
            </div>
            <span className="font-bold text-xl text-slate-900 tracking-tight">KanalPro</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#funktionen" className="hover:text-slate-900 transition-colors">Funktionen</a>
            <a href="#prozess" className="hover:text-slate-900 transition-colors">So funktionierts</a>
            <a href="#preise" className="hover:text-slate-900 transition-colors">Preise</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
              Anmelden
            </Link>
            <Link href="/registrieren" className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
              Kostenlos starten
            </Link>
          </div>
        </div>
      </header>

      {/* ───────── HERO ───────── */}
      <section className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-28 text-center">

          {/* Logo gross */}
          <div className="flex justify-center mb-10">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/30 rounded-3xl blur-2xl scale-110" />
              <div className="relative w-28 h-28 sm:w-36 sm:h-36 bg-slate-800/60 border border-white/10 rounded-3xl overflow-hidden flex items-center justify-center backdrop-blur-sm">
                <Image src="/logo.png" alt="KanalPro Logo" width={144} height={144} className="object-cover scale-110" priority />
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold px-4 py-2 rounded-full mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 bg-blue-400 rounded-full" />
            Speziell fuer Rohr- und Kanalservice-Betriebe
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight">
            Schluss mit Zettelwirtschaft.<br />
            <span className="text-blue-400">Alles digital, alles einfach.</span>
          </h1>

          <p className="text-lg sm:text-xl text-blue-100/80 mb-10 max-w-2xl mx-auto leading-relaxed">
            KanalPro ist die einfachste Verwaltungssoftware fuer kleine Rohr- und Kanalservice-Betriebe.
            Kunden, Auftraege, Rechnungen &mdash; alles an einem Ort.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/registrieren" className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white text-base font-bold rounded-2xl transition-all shadow-xl shadow-blue-600/30 hover:-translate-y-0.5">
              Jetzt kostenlos testen &rarr;
            </Link>
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-base font-semibold rounded-2xl transition-all backdrop-blur-sm">
              Bereits angemeldet? Login
            </Link>
          </div>

          <p className="mt-5 text-sm text-blue-200/60">14 Tage gratis &middot; Keine Kreditkarte &middot; Sofort loslegen</p>

          {/* Dashboard Mock */}
          <div className="mt-16 mx-auto max-w-4xl">
            <div className="bg-slate-800/50 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-sm shadow-2xl">
              <div className="h-8 bg-slate-900/60 border-b border-white/5 flex items-center gap-2 px-4">
                <span className="w-3 h-3 rounded-full bg-red-500/70" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <span className="w-3 h-3 rounded-full bg-green-500/70" />
                <span className="ml-4 text-xs text-slate-500 font-mono">kanalpro.de/dashboard</span>
              </div>
              <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Aktive Auftraege', value: '24', color: 'text-blue-400' },
                  { label: 'Offene Rechnungen', value: '8', color: 'text-yellow-400' },
                  { label: 'Kunden', value: '143', color: 'text-green-400' },
                  { label: 'Umsatz (Monat)', value: '12.480 EUR', color: 'text-purple-400' },
                ].map(function(item) {
                  return (
                    <div key={item.label} className="bg-slate-900/60 rounded-2xl p-4 border border-white/5">
                      <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                      <p className={'text-xl font-bold ' + item.color}>{item.value}</p>
                    </div>
                  );
                })}
              </div>
              <div className="px-6 pb-6 space-y-2">
                {['Kanalreinigung Musterstr. 5 -- In Bearbeitung', 'TV-Inspektion Hauptgasse 12 -- Abgeschlossen', 'Rohrreparatur Parkweg 3 -- Ausstehend'].map(function(t) {
                  return (
                    <div key={t} className="h-10 bg-slate-900/40 border border-white/5 rounded-xl flex items-center px-4">
                      <span className="text-xs text-slate-400">{t}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── STATS ───────── */}
      <section className="bg-blue-600 py-10">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: '500+', label: 'Betriebe vertrauen KanalPro' },
            { value: '14 Tage', label: 'Kostenlos testen' },
            { value: '5 Min', label: 'Einrichtungszeit' },
            { value: '100%', label: 'Made in Deutschland' },
          ].map(function(item) {
            return (
              <div key={item.label}>
                <p className="text-3xl font-extrabold text-white">{item.value}</p>
                <p className="text-sm text-blue-200 mt-1">{item.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────── FUNKTIONEN ───────── */}
      <section id="funktionen" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-4 py-2 rounded-full mb-4">Funktionen</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">Alles, was Ihr Betrieb braucht</h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">Entwickelt fuer den taeglichen Einsatz in Rohr- und Kanalservice-Unternehmen</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
                title: 'Kundenverwaltung',
                desc: 'Alle Kundendaten, Adressen und Kontakte uebersichtlich gespeichert — inkl. Anruf- und E-Mail-Funktion.',
                bg: 'bg-blue-50',
                fg: 'text-blue-600',
              },
              {
                icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z',
                title: 'Auftragsverwaltung',
                desc: 'Auftraege anlegen, Techniker zuweisen und den Fortschritt in Echtzeit verfolgen.',
                bg: 'bg-purple-50',
                fg: 'text-purple-600',
              },
              {
                icon: 'M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z',
                title: 'Rechnungen und PDF',
                desc: 'Professionelle Rechnungen in Sekunden erstellen — direkt als PDF herunterladen oder versenden.',
                bg: 'bg-green-50',
                fg: 'text-green-600',
              },
              {
                icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5',
                title: 'Disposition',
                desc: 'Einsaetze planen, Fahrzeuge einteilen und Mitarbeiter im Blick behalten — alles in einem Kalender.',
                bg: 'bg-orange-50',
                fg: 'text-orange-600',
              },
              {
                icon: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12',
                title: 'Fahrzeuge und Maschinen',
                desc: 'TUEAV-Termine, Wartungen und Kilometerstand — alle Fahrzeugdaten an einem Ort.',
                bg: 'bg-red-50',
                fg: 'text-red-600',
              },
              {
                icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z',
                title: 'Mitarbeiterverwaltung',
                desc: 'Stammdaten, Arbeitszeiten, Urlaub und Zertifikate aller Mitarbeiter digital erfassen.',
                bg: 'bg-teal-50',
                fg: 'text-teal-600',
              },
            ].map(function(f) {
              return (
                <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                  <div className={'w-12 h-12 rounded-xl flex items-center justify-center mb-4 ' + f.bg}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={'w-6 h-6 ' + f.fg}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                    </svg>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{f.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────── SO FUNKTIONIERTS ───────── */}
      <section id="prozess" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-4 py-2 rounded-full mb-4">In 3 Schritten</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">So einfach starten Sie durch</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            {[
              { step: '01', title: 'Konto erstellen', desc: 'Registrieren Sie sich kostenlos — in unter 5 Minuten sind Sie startklar. Keine Installation, laeuft im Browser.' },
              { step: '02', title: 'Daten eingeben', desc: 'Legen Sie Ihre Kunden, Mitarbeiter und Fahrzeuge an. Bestehende Daten koennen einfach importiert werden.' },
              { step: '03', title: 'Loslegen', desc: 'Erstellen Sie Ihren ersten Auftrag und schreiben Sie Ihre erste Rechnung. KanalPro waechst mit Ihrem Betrieb.' },
            ].map(function(item) {
              return (
                <div key={item.step} className="text-center">
                  <div className="w-16 h-16 bg-blue-600 text-white text-2xl font-black rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-600/30">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────── PREISE ───────── */}
      <section id="preise" className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-4 py-2 rounded-full mb-4">Preise</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">Einfache, faire Preise</h2>
            <p className="text-lg text-slate-500">14 Tage kostenlos testen &mdash; kein Risiko</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
            {[
              {
                name: 'Starter',
                price: 'Kostenlos',
                sub: '14 Tage Testphase',
                features: ['1 Nutzer', 'Bis zu 10 Kunden', 'Basis-Auftraege', 'Rechnungen als PDF'],
                cta: 'Jetzt starten',
                href: '/registrieren',
                highlight: false,
              },
              {
                name: 'Pro',
                price: '49 EUR',
                sub: 'pro Monat, zzgl. MwSt.',
                features: ['Bis zu 5 Nutzer', 'Unbegrenzte Kunden', 'Alle Funktionen', 'Fahrzeuge und Maschinen', 'Prioritaets-Support'],
                cta: 'Pro starten',
                href: '/registrieren',
                highlight: true,
              },
              {
                name: 'Enterprise',
                price: 'Auf Anfrage',
                sub: 'Individuelle Loesung',
                features: ['Unbegrenzte Nutzer', 'API-Zugang', 'Onboarding und Training', 'Dedizierter Support', 'SLA-Vertrag'],
                cta: 'Kontakt aufnehmen',
                href: 'mailto:info@kanalpro.de',
                highlight: false,
              },
            ].map(function(plan) {
              return (
                <div key={plan.name} className={'relative rounded-3xl p-8 border flex flex-col ' + (
                  plan.highlight
                    ? 'bg-blue-600 border-blue-600 text-white shadow-2xl shadow-blue-600/30 sm:scale-105'
                    : 'bg-white border-gray-100 text-slate-900'
                )}>
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-yellow-400 text-yellow-900 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wide">Beliebteste Wahl</span>
                    </div>
                  )}
                  <div className="mb-6">
                    <p className={'text-sm font-bold uppercase tracking-widest mb-1 ' + (plan.highlight ? 'text-blue-200' : 'text-blue-600')}>{plan.name}</p>
                    <p className={'text-3xl font-extrabold ' + (plan.highlight ? 'text-white' : 'text-slate-900')}>{plan.price}</p>
                    <p className={'text-sm mt-1 ' + (plan.highlight ? 'text-blue-200' : 'text-slate-400')}>{plan.sub}</p>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map(function(f) {
                      return (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <svg className={'w-4 h-4 flex-shrink-0 ' + (plan.highlight ? 'text-blue-200' : 'text-blue-600')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          <span className={plan.highlight ? 'text-white' : 'text-slate-600'}>{f}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <a href={plan.href} className={'w-full text-center py-3 rounded-xl font-bold text-sm transition-all ' + (
                    plan.highlight
                      ? 'bg-white text-blue-600 hover:bg-blue-50'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  )}>
                    {plan.cta}
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────── CTA BANNER ───────── */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-slate-800/60 border border-white/10 rounded-2xl overflow-hidden">
              <Image src="/logo.png" alt="KanalPro" width={80} height={80} className="object-cover scale-110 w-full h-full" />
            </div>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Bereit, Ihren Betrieb zu digitalisieren?
          </h2>
          <p className="text-blue-200 text-lg mb-10">
            Starten Sie heute kostenlos. Keine Kreditkarte, keine Bindung.
          </p>
          <Link href="/registrieren" className="inline-block px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold rounded-2xl transition-all shadow-xl shadow-blue-600/30 hover:-translate-y-0.5">
            Jetzt kostenlos starten &rarr;
          </Link>
          <p className="mt-4 text-sm text-blue-300/60">14 Tage gratis &middot; Danach ab 49 EUR/Monat</p>
        </div>
      </section>

      {/* ───────── FOOTER ───────── */}
      <footer className="bg-slate-900 border-t border-white/5 py-14">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-8 mb-10">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-800 border border-white/10 rounded-xl overflow-hidden flex items-center justify-center">
                <Image src="/logo.png" alt="KanalPro" width={36} height={36} className="object-cover scale-110" />
              </div>
              <span className="font-bold text-lg text-white tracking-tight">KanalPro</span>
            </Link>

            <nav className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
              <a href="#funktionen" className="hover:text-white transition-colors">Funktionen</a>
              <a href="#preise" className="hover:text-white transition-colors">Preise</a>
              <Link href="/login" className="hover:text-white transition-colors">Anmelden</Link>
              <Link href="/registrieren" className="hover:text-white transition-colors">Registrieren</Link>
            </nav>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>&copy; 2025 KanalPro. Alle Rechte vorbehalten.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Datenschutz</a>
              <a href="#" className="hover:text-white transition-colors">Impressum</a>
              <a href="#" className="hover:text-white transition-colors">AGB</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
