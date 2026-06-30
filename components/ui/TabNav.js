'use client';
import { useRef, useCallback } from 'react';

/**
 * TabNav — Generische, wiederverwendbare horizontale Tab-Navigation
 *
 * Verwendung:
 *   const TABS = [
 *     { id: 'stammdaten', label: 'Stammdaten' },
 *     { id: 'dokumente',  label: 'Dokumente', icon: <SomeSvgIcon /> },
 *   ];
 *
 *   <TabNav tabs={TABS} activeTab={tab} onChange={setTab} />
 *
 *   // Optional: Panel-Container mit passendem id-Attribut für Barrierefreiheit
 *   <div id="tabnav-panel-stammdaten" role="tabpanel" aria-labelledby="tabnav-tab-stammdaten">
 *     ...Inhalt...
 *   </div>
 *
 * Props:
 *   tabs       {Array<{ id: string, label: string, icon?: ReactNode }>}
 *              — Tab-Definitionen. Mindestens { id, label } pro Eintrag.
 *              — icon ist optional; wenn angegeben, wird es links vom Label gezeigt.
 *   activeTab  {string}
 *              — ID des aktuell aktiven Tabs.
 *   onChange   {(id: string) => void}
 *              — Callback, der beim Klicken oder Pfeiltasten-Navigation aufgerufen wird.
 *   id         {string}  [Standard: 'tabnav']
 *              — Präfix für aria-id-Attribute. Bei mehreren TabNavs auf einer Seite
 *                bitte eindeutige Werte vergeben (z. B. id="kunden-tabs").
 *   label      {string}  [Standard: 'Seitennavigation']
 *              — Beschriftung der Tablist før Screenreader.
 *   className  {string}  [Standard: '']
 *              — Zusätzliche Tailwind-Klassen für den äußeren Container.
 */
export default function TabNav({
  tabs = [],
  activeTab,
  onChange,
  id = 'tabnav',
  label = 'Seitennavigation',
  className = '',
}) {
  const listRef = useRef(null);

  /**
   * Pfeiltasten-Navigation gemäß WAI-ARIA Tabs Pattern:
   *   ArrowRight / ArrowLeft  — nächsten / vorherigen Tab fokussieren + aktivieren
   *   Home                    — ersten Tab fokussieren + aktivieren
   *   End                     — letzten Tab fokussieren + aktivieren
   */
  const handleKeyDown = useCallback(
    (e, index) => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();

      const buttons = Array.from(
        listRef.current?.querySelectorAll('[role="tab"]') ?? []
      );
      if (!buttons.length) return;

      let next = index;
      if (e.key === 'ArrowRight') next = (index + 1) % buttons.length;
      else if (e.key === 'ArrowLeft') next = (index - 1 + buttons.length) % buttons.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = buttons.length - 1;

      buttons[next].focus();
      onChange(tabs[next].id);
    },
    [tabs, onChange]
  );

  return (
    <div
      role="tablist"
      aria-label={label}
      ref={listRef}
      className={`flex gap-1 border-b border-gray-100 overflow-x-auto ${className}`}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            role="tab"
            id={`${id}-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`${id}-panel-${tab.id}`}
            /*
             * Roving tabIndex: nur der aktive Tab ist per Tab-Taste erreichbar.
             * Zwischen Tabs wird mit Pfeiltasten navigiert (ARIA-Standard).
             */
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap flex-shrink-0 focus:outline-none ${
              isActive
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {/* Icon ist optional */}
            {tab.icon && (
              <span className="w-4 h-4 shrink-0" aria-hidden="true">
                {tab.icon}
              </span>
            )}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
