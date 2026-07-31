import {
  CUSTOMER_KINDS,
  CUSTOMER_KIND_ICONS,
  CUSTOMER_KIND_LABELS,
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_DOT_CLASS,
  CUSTOMER_STATUS_LABELS,
  isCompanyKind,
} from "@/lib/customers";
import { RequiredFieldsProgress } from "@/components/dashboard/RequiredFieldsProgress";

type CustomerFormValues = {
  kind?: string;
  status?: string;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  legal_form?: string | null;
  register_number?: string | null;
  vat_id?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  fax?: string | null;
  website?: string | null;
  street?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  billing_same_as_main?: boolean;
  billing_street?: string | null;
  billing_postal_code?: string | null;
  billing_city?: string | null;
  service_same_as_main?: boolean;
  service_street?: string | null;
  service_postal_code?: string | null;
  service_city?: string | null;
  payment_term_days?: number | null;
  discount_percent?: number | null;
  discount_days?: number | null;
  debitor_number?: string | null;
  tags?: string[] | null;
};

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10";
const labelClass = "flex items-center gap-1.5 text-sm font-medium text-foreground";

function RequiredBadge() {
  return (
    <span className="rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-dark">
      Pflicht
    </span>
  );
}

function SectionHeading({
  icon,
  title,
  description,
  highlight,
}: {
  icon: string;
  title: string;
  description?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${highlight ? "bg-red-50" : "bg-brand-soft"}`}
      >
        {icon}
      </span>
      <div>
        <h2 className={`text-base font-semibold ${highlight ? "text-red-700" : "text-foreground"}`}>{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
    </div>
  );
}

function hiddenText(name: string, value: string | number | null | undefined) {
  return <input type="hidden" name={name} value={value ?? ""} />;
}

function hiddenCheckbox(name: string, checked: boolean | undefined) {
  return <input type="hidden" name={name} value={checked ? "on" : ""} />;
}

export function CustomerForm({
  formId,
  action,
  defaultValues,
  submitLabel,
  duplicateWarning,
  missingFields,
  section = "all",
  showProgress = true,
}: {
  formId: string;
  action: (formData: FormData) => void;
  defaultValues?: CustomerFormValues;
  submitLabel: string;
  duplicateWarning?: string[];
  missingFields?: string[];
  section?: "all" | "allgemein" | "adressen";
  showProgress?: boolean;
}) {
  const kind = defaultValues?.kind ?? "privat";
  const showCompanyFields = isCompanyKind(kind);
  const billingSame = defaultValues?.billing_same_as_main ?? true;
  const serviceSame = defaultValues?.service_same_as_main ?? true;

  const showAllgemein = section === "all" || section === "allgemein";
  const showAdressen = section === "all" || section === "adressen";

  const missing = new Set(missingFields ?? []);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-start">
      <form id={formId} action={action} className="space-y-10 rounded-2xl border border-border bg-card p-8">
        <input type="hidden" name="active_section" value={section} />
        {duplicateWarning && duplicateWarning.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">⚠ Möglicherweise bereits vorhanden</p>
            <p className="mt-1">
              Es wurden ähnliche Kunden gefunden (gleicher Firmenname, Telefon, E-Mail oder USt-IdNr.):
            </p>
            <ul className="mt-2 list-inside list-disc">
              {duplicateWarning.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <p className="mt-2">
              Bitte prüfen Sie, ob es sich um einen bestehenden Kunden handelt. Sie können den Kunden
              trotzdem als neuen Datensatz anlegen.
            </p>
            <input type="hidden" name="confirm_duplicate" value="1" />
          </div>
        )}

        {showAllgemein && (
          <>
            <section className="space-y-5">
              <SectionHeading icon="👤" title="Allgemeine Informationen" description="Grundlegende Stammdaten des Kunden." />
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <span className={labelClass}>
                    Kundenart <RequiredBadge />
                  </span>
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {CUSTOMER_KINDS.map((k) => (
                      <label key={k} className="cursor-pointer">
                        <input type="radio" name="kind" value={k} defaultChecked={kind === k} className="peer sr-only" />
                        <div className="flex flex-col items-center gap-1 rounded-xl border-2 border-border bg-background px-2 py-3 text-center transition peer-checked:border-brand peer-checked:bg-brand-soft">
                          <span className="text-xl">{CUSTOMER_KIND_ICONS[k]}</span>
                          <span className="text-xs font-medium">{CUSTOMER_KIND_LABELS[k]}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <span className={labelClass}>
                    Status <RequiredBadge />
                  </span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CUSTOMER_STATUSES.map((s) => (
                      <label key={s} className="cursor-pointer">
                        <input
                          type="radio"
                          name="status"
                          value={s}
                          defaultChecked={(defaultValues?.status ?? "interessent") === s}
                          className="peer sr-only"
                        />
                        <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm transition peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:font-semibold">
                          <span className={`h-2 w-2 rounded-full ${CUSTOMER_STATUS_DOT_CLASS[s]}`} />
                          {CUSTOMER_STATUS_LABELS[s]}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {!showCompanyFields && (
              <section className={`space-y-5 ${missing.has("name") ? "rounded-xl ring-2 ring-red-300" : ""}`}>
                <SectionHeading icon="🙋" title="Persönliche Daten" description="Name des Privatkunden." highlight={missing.has("name")} />
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="first_name" className={labelClass}>
                      Vorname
                    </label>
                    <input id="first_name" name="first_name" type="text" defaultValue={defaultValues?.first_name ?? ""} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="last_name" className={labelClass}>
                      Nachname <RequiredBadge />
                    </label>
                    <input id="last_name" name="last_name" type="text" defaultValue={defaultValues?.last_name ?? ""} className={inputClass} />
                  </div>
                </div>
              </section>
            )}

            {showCompanyFields && (
              <section className={`space-y-5 ${missing.has("name") ? "rounded-xl ring-2 ring-red-300" : ""}`}>
                <SectionHeading icon="🏢" title="Unternehmen" description="Firmendaten und rechtliche Angaben." highlight={missing.has("name")} />
                <div className="space-y-5">
                  <div>
                    <label htmlFor="company_name" className={labelClass}>
                      Firmenname <RequiredBadge />
                    </label>
                    <input id="company_name" name="company_name" type="text" defaultValue={defaultValues?.company_name ?? ""} className={inputClass} />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-3">
                    <div>
                      <label htmlFor="legal_form" className={labelClass}>
                        Rechtsform
                      </label>
                      <input id="legal_form" name="legal_form" type="text" placeholder="z. B. GmbH" defaultValue={defaultValues?.legal_form ?? ""} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="register_number" className={labelClass}>
                        Handelsregister
                      </label>
                      <input id="register_number" name="register_number" type="text" defaultValue={defaultValues?.register_number ?? ""} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="vat_id" className={labelClass}>
                        USt-IdNr.
                      </label>
                      <input id="vat_id" name="vat_id" type="text" defaultValue={defaultValues?.vat_id ?? ""} className={inputClass} />
                    </div>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="first_name" className={labelClass}>
                        Ansprechpartner (Vorname)
                      </label>
                      <input id="first_name" name="first_name" type="text" defaultValue={defaultValues?.first_name ?? ""} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="last_name" className={labelClass}>
                        Ansprechpartner (Nachname)
                      </label>
                      <input id="last_name" name="last_name" type="text" defaultValue={defaultValues?.last_name ?? ""} className={inputClass} />
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className={`space-y-5 ${missing.has("contact") ? "rounded-xl ring-2 ring-red-300" : ""}`}>
              <SectionHeading icon="📞" title="Kontakt" description="Wie der Kunde erreichbar ist." highlight={missing.has("contact")} />
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="email" className={labelClass}>
                    E-Mail
                  </label>
                  <input id="email" name="email" type="email" defaultValue={defaultValues?.email ?? ""} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="phone" className={labelClass}>
                    Telefon
                  </label>
                  <input id="phone" name="phone" type="text" defaultValue={defaultValues?.phone ?? ""} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="mobile" className={labelClass}>
                    Mobil
                  </label>
                  <input id="mobile" name="mobile" type="text" defaultValue={defaultValues?.mobile ?? ""} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="fax" className={labelClass}>
                    Fax
                  </label>
                  <input id="fax" name="fax" type="text" defaultValue={defaultValues?.fax ?? ""} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="website" className={labelClass}>
                    Website
                  </label>
                  <input id="website" name="website" type="text" defaultValue={defaultValues?.website ?? ""} className={inputClass} />
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <SectionHeading icon="💳" title="Zahlungsinformationen" description="Zahlungsziel, Skonto und Debitorennummer." />
              <div className="grid gap-5 sm:grid-cols-3">
                <div>
                  <label htmlFor="payment_term_days" className={labelClass}>
                    Zahlungsziel (Tage)
                  </label>
                  <input id="payment_term_days" name="payment_term_days" type="number" min="0" defaultValue={defaultValues?.payment_term_days ?? ""} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="discount_percent" className={labelClass}>
                    Skonto (%)
                  </label>
                  <input id="discount_percent" name="discount_percent" type="number" step="0.01" min="0" defaultValue={defaultValues?.discount_percent ?? ""} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="discount_days" className={labelClass}>
                    Skontofrist (Tage)
                  </label>
                  <input id="discount_days" name="discount_days" type="number" min="0" defaultValue={defaultValues?.discount_days ?? ""} className={inputClass} />
                </div>
              </div>
              <div>
                <label htmlFor="debitor_number" className={labelClass}>
                  Debitorennummer
                </label>
                <input id="debitor_number" name="debitor_number" type="text" defaultValue={defaultValues?.debitor_number ?? ""} className={inputClass} />
              </div>
            </section>

            <section className="space-y-2">
              <label htmlFor="tags" className={labelClass}>
                Tags
              </label>
              <input
                id="tags"
                name="tags"
                type="text"
                placeholder="z. B. Stammkunde, Notdienst, VIP"
                defaultValue={(defaultValues?.tags ?? []).join(", ")}
                className={inputClass}
              />
              <p className="text-xs text-muted">Mehrere Tags durch Komma trennen.</p>
            </section>
          </>
        )}

        {!showAllgemein && (
          <>
            {hiddenText("kind", kind)}
            {hiddenText("status", defaultValues?.status ?? "interessent")}
            {hiddenText("first_name", defaultValues?.first_name)}
            {hiddenText("last_name", defaultValues?.last_name)}
            {hiddenText("company_name", defaultValues?.company_name)}
            {hiddenText("legal_form", defaultValues?.legal_form)}
            {hiddenText("register_number", defaultValues?.register_number)}
            {hiddenText("vat_id", defaultValues?.vat_id)}
            {hiddenText("email", defaultValues?.email)}
            {hiddenText("phone", defaultValues?.phone)}
            {hiddenText("mobile", defaultValues?.mobile)}
            {hiddenText("fax", defaultValues?.fax)}
            {hiddenText("website", defaultValues?.website)}
            {hiddenText("payment_term_days", defaultValues?.payment_term_days)}
            {hiddenText("discount_percent", defaultValues?.discount_percent)}
            {hiddenText("discount_days", defaultValues?.discount_days)}
            {hiddenText("debitor_number", defaultValues?.debitor_number)}
            {hiddenText("tags", (defaultValues?.tags ?? []).join(", "))}
          </>
        )}

        {showAdressen && (
          <>
            <section className={`space-y-5 ${missing.has("street") || missing.has("postal_code") || missing.has("city") ? "rounded-xl ring-2 ring-red-300" : ""}`}>
              <SectionHeading
                icon="📍"
                title="Hauptadresse"
                description="Koordinaten werden beim Speichern automatisch ermittelt (bestmöglich, nicht garantiert)."
                highlight={missing.has("street") || missing.has("postal_code") || missing.has("city")}
              />
              <div className="space-y-5">
                <div>
                  <label htmlFor="street" className={labelClass}>
                    Straße &amp; Hausnummer
                  </label>
                  <input id="street" name="street" type="text" defaultValue={defaultValues?.street ?? ""} className={inputClass} />
                </div>
                <div className="grid gap-5 sm:grid-cols-[140px_1fr_140px]">
                  <div>
                    <label htmlFor="postal_code" className={labelClass}>
                      PLZ
                    </label>
                    <input id="postal_code" name="postal_code" type="text" defaultValue={defaultValues?.postal_code ?? ""} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="city" className={labelClass}>
                      Ort
                    </label>
                    <input id="city" name="city" type="text" defaultValue={defaultValues?.city ?? ""} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="country" className={labelClass}>
                      Land
                    </label>
                    <input id="country" name="country" type="text" defaultValue={defaultValues?.country ?? "Deutschland"} className={inputClass} />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <SectionHeading icon="🧾" title="Rechnungsadresse" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="billing_same_as_main" defaultChecked={billingSame} />
                Gleich wie Hauptadresse
              </label>
              <div className="grid gap-5 sm:grid-cols-[1fr_140px_1fr]">
                <div>
                  <label htmlFor="billing_street" className={labelClass}>
                    Straße &amp; Hausnummer
                  </label>
                  <input id="billing_street" name="billing_street" type="text" defaultValue={defaultValues?.billing_street ?? ""} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="billing_postal_code" className={labelClass}>
                    PLZ
                  </label>
                  <input id="billing_postal_code" name="billing_postal_code" type="text" defaultValue={defaultValues?.billing_postal_code ?? ""} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="billing_city" className={labelClass}>
                    Ort
                  </label>
                  <input id="billing_city" name="billing_city" type="text" defaultValue={defaultValues?.billing_city ?? ""} className={inputClass} />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <SectionHeading icon="🛠️" title="Einsatzadresse" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="service_same_as_main" defaultChecked={serviceSame} />
                Gleich wie Hauptadresse
              </label>
              <div className="grid gap-5 sm:grid-cols-[1fr_140px_1fr]">
                <div>
                  <label htmlFor="service_street" className={labelClass}>
                    Straße &amp; Hausnummer
                  </label>
                  <input id="service_street" name="service_street" type="text" defaultValue={defaultValues?.service_street ?? ""} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="service_postal_code" className={labelClass}>
                    PLZ
                  </label>
                  <input id="service_postal_code" name="service_postal_code" type="text" defaultValue={defaultValues?.service_postal_code ?? ""} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="service_city" className={labelClass}>
                    Ort
                  </label>
                  <input id="service_city" name="service_city" type="text" defaultValue={defaultValues?.service_city ?? ""} className={inputClass} />
                </div>
              </div>
            </section>
          </>
        )}

        {!showAdressen && (
          <>
            {hiddenText("street", defaultValues?.street)}
            {hiddenText("postal_code", defaultValues?.postal_code)}
            {hiddenText("city", defaultValues?.city)}
            {hiddenText("country", defaultValues?.country ?? "Deutschland")}
            {hiddenCheckbox("billing_same_as_main", billingSame)}
            {hiddenText("billing_street", defaultValues?.billing_street)}
            {hiddenText("billing_postal_code", defaultValues?.billing_postal_code)}
            {hiddenText("billing_city", defaultValues?.billing_city)}
            {hiddenCheckbox("service_same_as_main", serviceSame)}
            {hiddenText("service_street", defaultValues?.service_street)}
            {hiddenText("service_postal_code", defaultValues?.service_postal_code)}
            {hiddenText("service_city", defaultValues?.service_city)}
          </>
        )}

        <button type="submit" className="rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
          {submitLabel}
        </button>
      </form>

      {showProgress && (
        <div className="lg:sticky lg:top-6">
          <RequiredFieldsProgress formId={formId} />
        </div>
      )}
    </div>
  );
}
