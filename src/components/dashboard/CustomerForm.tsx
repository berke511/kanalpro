import {
  AlertTriangle,
  Banknote,
  Building2,
  MapPin,
  Phone,
  Receipt,
  Tags as TagsIcon,
  UserRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  CUSTOMER_KINDS,
  CUSTOMER_KIND_LABELS,
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_DOT_CLASS,
  CUSTOMER_STATUS_LABELS,
  isCompanyKind,
} from "@/lib/customers";
import { RequiredFieldsProgress } from "@/components/dashboard/RequiredFieldsProgress";
import { DuplicateCheckLive } from "@/components/dashboard/DuplicateCheckLive";
import { CustomerKindIcon } from "@/components/dashboard/CustomerKindIcon";

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
  assigned_employee_id?: string | null;
};

const CARD_CLASS = "rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7";
// text-base (16px) auf Mobile verhindert, dass iOS Safari beim Fokussieren
// eines Eingabefelds automatisch hineinzoomt; ab sm: wieder text-sm.
const inputBaseClass =
  "mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-base outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/10 sm:text-sm";
const errorInputClass = "border-red-300 ring-2 ring-red-100";
const labelClass = "text-sm font-medium text-foreground break-words";
const helperClass = "mt-1 text-xs text-muted";

const COUNTRY_OPTIONS = [
  "Deutschland",
  "Österreich",
  "Schweiz",
  "Niederlande",
  "Belgien",
  "Luxemburg",
  "Frankreich",
  "Polen",
  "Dänemark",
];

const LEGAL_FORM_OPTIONS = ["GmbH", "UG (haftungsbeschränkt)", "AG", "GmbH & Co. KG", "KG", "OHG", "GbR", "e.K.", "Einzelunternehmen"];

function Field({
  id,
  label,
  helper,
  error,
  children,
}: {
  id: string;
  label: React.ReactNode;
  helper?: string;
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-600">Pflichtfeld – bitte ausfüllen.</p>
      ) : (
        helper && <p className={helperClass}>{helper}</p>
      )}
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  span2,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  span2?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`${CARD_CLASS} ${span2 ? "xl:col-span-2" : ""}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-dark">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="text-base font-semibold leading-tight text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
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
  autoFocusFirstField = false,
  customerId,
  employees = [],
}: {
  formId: string;
  action: (formData: FormData) => void;
  defaultValues?: CustomerFormValues;
  submitLabel: string;
  duplicateWarning?: string[];
  missingFields?: string[];
  section?: "all" | "allgemein" | "adressen";
  showProgress?: boolean;
  autoFocusFirstField?: boolean;
  customerId?: string;
  employees?: Array<{ id: string; full_name: string | null }>;
}) {
  const kind = defaultValues?.kind ?? "privat";
  const showCompanyFields = isCompanyKind(kind);
  const billingSame = defaultValues?.billing_same_as_main ?? true;
  const serviceSame = defaultValues?.service_same_as_main ?? true;

  const showAllgemein = section === "all" || section === "allgemein";
  const showAdressen = section === "all" || section === "adressen";

  const missing = new Set(missingFields ?? []);
  const nameMissing = missing.has("name");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-start">
      <form id={formId} action={action} className="space-y-6">
        <input type="hidden" name="active_section" value={section} />

        {duplicateWarning && duplicateWarning.length > 0 && (
          <div className={`${CARD_CLASS} border-amber-300 bg-amber-50`}>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
              <AlertTriangle className="h-4 w-4" />
              Möglicherweise bereits vorhanden
            </p>
            <p className="mt-1 text-sm text-amber-900">
              Es wurden ähnliche Kunden gefunden (gleicher Firmenname, Telefon, E-Mail oder USt-IdNr.):
            </p>
            <ul className="mt-2 list-inside list-disc text-sm text-amber-900">
              {duplicateWarning.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-amber-900">
              Bitte prüfen Sie, ob es sich um einen bestehenden Kunden handelt. Sie können den Kunden trotzdem als
              neuen Datensatz anlegen.
            </p>
            <input type="hidden" name="confirm_duplicate" value="1" />
          </div>
        )}

        {showAllgemein && <DuplicateCheckLive formId={formId} excludeId={customerId} />}

        {showAllgemein && (
          <div className="space-y-6">
            <SectionCard icon={UserRound} title="Allgemeine Informationen" description="Grundlegende Stammdaten des Kunden.">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <span className={labelClass}>Kundenart</span>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {CUSTOMER_KINDS.map((k) => (
                      <label key={k} className="cursor-pointer">
                        <input type="radio" name="kind" value={k} defaultChecked={kind === k} className="peer sr-only" />
                        <div className="flex h-full flex-col items-center gap-1.5 rounded-xl border-2 border-border bg-background px-1.5 py-3.5 text-center transition peer-checked:border-brand peer-checked:bg-brand-soft">
                          <CustomerKindIcon kind={k} className="h-5 w-5 shrink-0 text-muted" />
                          <span className="break-words text-xs font-medium leading-tight">{CUSTOMER_KIND_LABELS[k]}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <span className={labelClass}>Status</span>
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
                        <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-2.5 text-sm transition peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:font-semibold">
                          <span className={`h-2 w-2 rounded-full ${CUSTOMER_STATUS_DOT_CLASS[s]}`} />
                          {CUSTOMER_STATUS_LABELS[s]}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <Field id="assigned_employee_id" label="Zuständiger Mitarbeiter" helper="Optional – für interne Zuordnung und Filter.">
                <select
                  id="assigned_employee_id"
                  name="assigned_employee_id"
                  defaultValue={defaultValues?.assigned_employee_id ?? ""}
                  className={inputBaseClass}
                >
                  <option value="">Kein zuständiger Mitarbeiter</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name ?? "Unbenannt"}
                    </option>
                  ))}
                </select>
              </Field>
            </SectionCard>

            {!showCompanyFields && (
              <SectionCard icon={UserRound} title="Persönliche Daten" description="Name des Privatkunden.">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="first_name" label="Vorname" helper="Optional.">
                    <input
                      id="first_name"
                      name="first_name"
                      type="text"
                      placeholder="Max"
                      defaultValue={defaultValues?.first_name ?? ""}
                      className={inputBaseClass}
                    />
                  </Field>
                  <Field id="last_name" label="Nachname" error={nameMissing}>
                    <input
                      id="last_name"
                      name="last_name"
                      type="text"
                      placeholder="Mustermann"
                      autoFocus={autoFocusFirstField}
                      defaultValue={defaultValues?.last_name ?? ""}
                      className={`${inputBaseClass} ${nameMissing ? errorInputClass : ""}`}
                    />
                  </Field>
                </div>
              </SectionCard>
            )}

            {showCompanyFields && (
              <SectionCard icon={Building2} title="Unternehmen" description="Firmendaten und rechtliche Angaben.">
                <Field id="company_name" label="Firmenname" error={nameMissing} helper="Erscheint auf Rechnungen und Angeboten.">
                  <input
                    id="company_name"
                    name="company_name"
                    type="text"
                    placeholder="z. B. Mustermann GmbH"
                    autoFocus={autoFocusFirstField}
                    defaultValue={defaultValues?.company_name ?? ""}
                    className={`${inputBaseClass} ${nameMissing ? errorInputClass : ""}`}
                  />
                </Field>
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field id="legal_form" label="Rechtsform">
                    <input
                      id="legal_form"
                      name="legal_form"
                      type="text"
                      list="legal-form-options"
                      placeholder="z. B. GmbH"
                      defaultValue={defaultValues?.legal_form ?? ""}
                      className={inputBaseClass}
                    />
                    <datalist id="legal-form-options">
                      {LEGAL_FORM_OPTIONS.map((o) => (
                        <option key={o} value={o} />
                      ))}
                    </datalist>
                  </Field>
                  <Field id="register_number" label="Handelsregister">
                    <input
                      id="register_number"
                      name="register_number"
                      type="text"
                      placeholder="HRB 12345"
                      defaultValue={defaultValues?.register_number ?? ""}
                      className={inputBaseClass}
                    />
                  </Field>
                  <Field id="vat_id" label="USt-IdNr." helper="Für Rechnungen an Unternehmen.">
                    <input
                      id="vat_id"
                      name="vat_id"
                      type="text"
                      placeholder="DE123456789"
                      defaultValue={defaultValues?.vat_id ?? ""}
                      className={inputBaseClass}
                    />
                  </Field>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="first_name" label="Ansprechpartner – Vorname">
                    <input
                      id="first_name"
                      name="first_name"
                      type="text"
                      placeholder="Max"
                      defaultValue={defaultValues?.first_name ?? ""}
                      className={inputBaseClass}
                    />
                  </Field>
                  <Field id="last_name" label="Ansprechpartner – Nachname">
                    <input
                      id="last_name"
                      name="last_name"
                      type="text"
                      placeholder="Mustermann"
                      defaultValue={defaultValues?.last_name ?? ""}
                      className={inputBaseClass}
                    />
                  </Field>
                </div>
              </SectionCard>
            )}

            <SectionCard icon={Phone} title="Kontakt" description="Wie der Kunde erreichbar ist.">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="email" label="E-Mail">
                  <input id="email" name="email" type="email" placeholder="kontakt@firma.de" defaultValue={defaultValues?.email ?? ""} className={inputBaseClass} />
                </Field>
                <Field id="phone" label="Telefon">
                  <input id="phone" name="phone" type="text" placeholder="+49 30 1234567" defaultValue={defaultValues?.phone ?? ""} className={inputBaseClass} />
                </Field>
                <Field id="mobile" label="Mobil">
                  <input id="mobile" name="mobile" type="text" placeholder="+49 151 1234567" defaultValue={defaultValues?.mobile ?? ""} className={inputBaseClass} />
                </Field>
                <Field id="fax" label="Fax">
                  <input id="fax" name="fax" type="text" defaultValue={defaultValues?.fax ?? ""} className={inputBaseClass} />
                </Field>
                <Field id="website" label="Website">
                  <input id="website" name="website" type="text" placeholder="https://www.firma.de" defaultValue={defaultValues?.website ?? ""} className={inputBaseClass} />
                </Field>
              </div>
            </SectionCard>

            <SectionCard icon={Banknote} title="Zahlungsinformationen" description="Zahlungsziel, Skonto und Debitorennummer.">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="payment_term_days" label="Zahlungsziel (Tage)" helper="Frist bis zur Fälligkeit.">
                  <input id="payment_term_days" name="payment_term_days" type="number" min="0" placeholder="14" defaultValue={defaultValues?.payment_term_days ?? ""} className={inputBaseClass} />
                </Field>
                <Field id="discount_percent" label="Skonto (%)">
                  <input id="discount_percent" name="discount_percent" type="number" step="0.01" min="0" placeholder="2" defaultValue={defaultValues?.discount_percent ?? ""} className={inputBaseClass} />
                </Field>
                <Field id="discount_days" label="Skontofrist (Tage)">
                  <input id="discount_days" name="discount_days" type="number" min="0" placeholder="7" defaultValue={defaultValues?.discount_days ?? ""} className={inputBaseClass} />
                </Field>
              </div>
              <Field id="debitor_number" label="Debitorennummer">
                <input id="debitor_number" name="debitor_number" type="text" placeholder="D-10023" defaultValue={defaultValues?.debitor_number ?? ""} className={inputBaseClass} />
              </Field>
            </SectionCard>

            <SectionCard icon={TagsIcon} title="Tags" description="Freie Klassifizierung, z. B. für Filter und Auswertungen.">
              <Field id="tags" label="Tags" helper="Mehrere Tags durch Komma trennen.">
                <input
                  id="tags"
                  name="tags"
                  type="text"
                  placeholder="z. B. Stammkunde, Notdienst, VIP"
                  defaultValue={(defaultValues?.tags ?? []).join(", ")}
                  className={inputBaseClass}
                />
              </Field>
            </SectionCard>
          </div>
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
            {hiddenText("assigned_employee_id", defaultValues?.assigned_employee_id)}
          </>
        )}

        {showAdressen && (
          <div className="space-y-6">
            <SectionCard icon={MapPin} title="Hauptadresse" description="Koordinaten werden beim Speichern automatisch ermittelt (bestmöglich, nicht garantiert).">
              <Field id="street" label="Straße & Hausnummer">
                <input id="street" name="street" type="text" placeholder="Musterstraße 12" defaultValue={defaultValues?.street ?? ""} className={inputBaseClass} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-[140px_1fr_160px]">
                <Field id="postal_code" label="PLZ">
                  <input id="postal_code" name="postal_code" type="text" placeholder="12345" defaultValue={defaultValues?.postal_code ?? ""} className={inputBaseClass} />
                </Field>
                <Field id="city" label="Ort">
                  <input id="city" name="city" type="text" placeholder="Berlin" defaultValue={defaultValues?.city ?? ""} className={inputBaseClass} />
                </Field>
                <Field id="country" label="Land">
                  <input id="country" name="country" type="text" list="country-options" defaultValue={defaultValues?.country ?? "Deutschland"} className={inputBaseClass} />
                  <datalist id="country-options">
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Field>
              </div>
            </SectionCard>

            <SectionCard icon={Receipt} title="Rechnungsadresse">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="billing_same_as_main" defaultChecked={billingSame} />
                Gleich wie Hauptadresse
              </label>
              <Field id="billing_street" label="Straße & Hausnummer">
                <input id="billing_street" name="billing_street" type="text" defaultValue={defaultValues?.billing_street ?? ""} className={inputBaseClass} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
                <Field id="billing_postal_code" label="PLZ">
                  <input id="billing_postal_code" name="billing_postal_code" type="text" defaultValue={defaultValues?.billing_postal_code ?? ""} className={inputBaseClass} />
                </Field>
                <Field id="billing_city" label="Ort">
                  <input id="billing_city" name="billing_city" type="text" defaultValue={defaultValues?.billing_city ?? ""} className={inputBaseClass} />
                </Field>
              </div>
            </SectionCard>

            <SectionCard icon={Wrench} title="Einsatzadresse">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="service_same_as_main" defaultChecked={serviceSame} />
                Gleich wie Hauptadresse
              </label>
              <Field id="service_street" label="Straße & Hausnummer">
                <input id="service_street" name="service_street" type="text" defaultValue={defaultValues?.service_street ?? ""} className={inputBaseClass} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
                <Field id="service_postal_code" label="PLZ">
                  <input id="service_postal_code" name="service_postal_code" type="text" defaultValue={defaultValues?.service_postal_code ?? ""} className={inputBaseClass} />
                </Field>
                <Field id="service_city" label="Ort">
                  <input id="service_city" name="service_city" type="text" defaultValue={defaultValues?.service_city ?? ""} className={inputBaseClass} />
                </Field>
              </div>
            </SectionCard>
          </div>
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
