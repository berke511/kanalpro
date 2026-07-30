import {
  COMPANY_KINDS,
  CUSTOMER_KINDS,
  CUSTOMER_KIND_LABELS,
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_LABELS,
  isCompanyKind,
} from "@/lib/customers";

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
  "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand";
const labelClass = "text-sm font-medium";
const sectionHeadingClass = "text-sm font-semibold text-foreground";

export function CustomerForm({
  action,
  defaultValues,
  submitLabel,
  duplicateWarning,
}: {
  action: (formData: FormData) => void;
  defaultValues?: CustomerFormValues;
  submitLabel: string;
  duplicateWarning?: string[];
}) {
  const kind = defaultValues?.kind ?? "privat";
  const showCompanyFields = isCompanyKind(kind);
  const billingSame = defaultValues?.billing_same_as_main ?? true;
  const serviceSame = defaultValues?.service_same_as_main ?? true;

  return (
    <form action={action} className="space-y-8">
      {duplicateWarning && duplicateWarning.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Möglicherweise bereits vorhanden</p>
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

      <div>
        <span className={sectionHeadingClass}>Kundenart &amp; Status</span>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="kind" className={labelClass}>
              Kundenart
            </label>
            <select id="kind" name="kind" defaultValue={kind} className={inputClass}>
              {CUSTOMER_KINDS.map((k) => (
                <option key={k} value={k}>
                  {CUSTOMER_KIND_LABELS[k]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">
              {COMPANY_KINDS.join(", ")} zeigen Unternehmensfelder an.
            </p>
          </div>
          <div>
            <label htmlFor="status" className={labelClass}>
              Status
            </label>
            <select id="status" name="status" defaultValue={defaultValues?.status ?? "interessent"} className={inputClass}>
              {CUSTOMER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CUSTOMER_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!showCompanyFields && (
        <div>
          <span className={sectionHeadingClass}>Person</span>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="first_name" className={labelClass}>
                Vorname
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                defaultValue={defaultValues?.first_name ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="last_name" className={labelClass}>
                Nachname *
              </label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                defaultValue={defaultValues?.last_name ?? ""}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      {showCompanyFields && (
        <div>
          <span className={sectionHeadingClass}>Unternehmen</span>
          <div className="mt-3 space-y-4">
            <div>
              <label htmlFor="company_name" className={labelClass}>
                Firmenname *
              </label>
              <input
                id="company_name"
                name="company_name"
                type="text"
                defaultValue={defaultValues?.company_name ?? ""}
                className={inputClass}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="legal_form" className={labelClass}>
                  Rechtsform
                </label>
                <input
                  id="legal_form"
                  name="legal_form"
                  type="text"
                  placeholder="z. B. GmbH"
                  defaultValue={defaultValues?.legal_form ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="register_number" className={labelClass}>
                  Handelsregister
                </label>
                <input
                  id="register_number"
                  name="register_number"
                  type="text"
                  defaultValue={defaultValues?.register_number ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="vat_id" className={labelClass}>
                  USt-IdNr.
                </label>
                <input
                  id="vat_id"
                  name="vat_id"
                  type="text"
                  defaultValue={defaultValues?.vat_id ?? ""}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="first_name" className={labelClass}>
                Ansprechpartner (Vorname)
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                defaultValue={defaultValues?.first_name ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="last_name" className={labelClass}>
                Ansprechpartner (Nachname)
              </label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                defaultValue={defaultValues?.last_name ?? ""}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <span className={sectionHeadingClass}>Kontakt</span>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
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
      </div>

      <div>
        <span className={sectionHeadingClass}>Hauptadresse</span>
        <div className="mt-3 space-y-4">
          <div>
            <label htmlFor="street" className={labelClass}>
              Straße &amp; Hausnummer
            </label>
            <input id="street" name="street" type="text" defaultValue={defaultValues?.street ?? ""} className={inputClass} />
          </div>
          <div className="grid gap-4 sm:grid-cols-[140px_1fr_140px]">
            <div>
              <label htmlFor="postal_code" className={labelClass}>
                PLZ
              </label>
              <input
                id="postal_code"
                name="postal_code"
                type="text"
                defaultValue={defaultValues?.postal_code ?? ""}
                className={inputClass}
              />
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
              <input
                id="country"
                name="country"
                type="text"
                defaultValue={defaultValues?.country ?? "Deutschland"}
                className={inputClass}
              />
            </div>
          </div>
          <p className="text-xs text-muted">
            Koordinaten werden beim Speichern automatisch ermittelt (bestmöglich, nicht garantiert).
          </p>
        </div>
      </div>

      <div>
        <span className={sectionHeadingClass}>Rechnungsadresse</span>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" name="billing_same_as_main" defaultChecked={billingSame} />
          Gleich wie Hauptadresse
        </label>
        <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_140px_1fr]">
          <div>
            <label htmlFor="billing_street" className={labelClass}>
              Straße &amp; Hausnummer
            </label>
            <input
              id="billing_street"
              name="billing_street"
              type="text"
              defaultValue={defaultValues?.billing_street ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="billing_postal_code" className={labelClass}>
              PLZ
            </label>
            <input
              id="billing_postal_code"
              name="billing_postal_code"
              type="text"
              defaultValue={defaultValues?.billing_postal_code ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="billing_city" className={labelClass}>
              Ort
            </label>
            <input
              id="billing_city"
              name="billing_city"
              type="text"
              defaultValue={defaultValues?.billing_city ?? ""}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div>
        <span className={sectionHeadingClass}>Einsatzadresse</span>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" name="service_same_as_main" defaultChecked={serviceSame} />
          Gleich wie Hauptadresse
        </label>
        <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_140px_1fr]">
          <div>
            <label htmlFor="service_street" className={labelClass}>
              Straße &amp; Hausnummer
            </label>
            <input
              id="service_street"
              name="service_street"
              type="text"
              defaultValue={defaultValues?.service_street ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="service_postal_code" className={labelClass}>
              PLZ
            </label>
            <input
              id="service_postal_code"
              name="service_postal_code"
              type="text"
              defaultValue={defaultValues?.service_postal_code ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="service_city" className={labelClass}>
              Ort
            </label>
            <input
              id="service_city"
              name="service_city"
              type="text"
              defaultValue={defaultValues?.service_city ?? ""}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div>
        <span className={sectionHeadingClass}>Zahlungsinformationen</span>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="payment_term_days" className={labelClass}>
              Zahlungsziel (Tage)
            </label>
            <input
              id="payment_term_days"
              name="payment_term_days"
              type="number"
              min="0"
              defaultValue={defaultValues?.payment_term_days ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="discount_percent" className={labelClass}>
              Skonto (%)
            </label>
            <input
              id="discount_percent"
              name="discount_percent"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultValues?.discount_percent ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="discount_days" className={labelClass}>
              Skontofrist (Tage)
            </label>
            <input
              id="discount_days"
              name="discount_days"
              type="number"
              min="0"
              defaultValue={defaultValues?.discount_days ?? ""}
              className={inputClass}
            />
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="debitor_number" className={labelClass}>
            Debitorennummer
          </label>
          <input
            id="debitor_number"
            name="debitor_number"
            type="text"
            defaultValue={defaultValues?.debitor_number ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div>
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
        <p className="mt-1 text-xs text-muted">Mehrere Tags durch Komma trennen.</p>
      </div>

      <button
        type="submit"
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        {submitLabel}
      </button>
    </form>
  );
}
