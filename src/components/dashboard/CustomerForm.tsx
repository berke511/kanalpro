type CustomerFormValues = {
  kind?: string;
  name?: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  street?: string | null;
  postal_code?: string | null;
  city?: string | null;
  notes?: string | null;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand";
const labelClass = "text-sm font-medium";

export function CustomerForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  defaultValues?: CustomerFormValues;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-6">
      <div>
        <span className={labelClass}>Kundentyp</span>
        <div className="mt-2 flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="kind"
              value="privat"
              defaultChecked={(defaultValues?.kind ?? "privat") === "privat"}
            />
            Privatkunde
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="kind"
              value="firma"
              defaultChecked={defaultValues?.kind === "firma"}
            />
            Firmenkunde
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="name" className={labelClass}>
          Name *
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={defaultValues?.name ?? ""}
          placeholder="z. B. Müller GmbH oder Max Mustermann"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="contact_person" className={labelClass}>
          Ansprechpartner
        </label>
        <input
          id="contact_person"
          name="contact_person"
          type="text"
          defaultValue={defaultValues?.contact_person ?? ""}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className={labelClass}>
            E-Mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="phone" className={labelClass}>
            Telefon
          </label>
          <input
            id="phone"
            name="phone"
            type="text"
            defaultValue={defaultValues?.phone ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="street" className={labelClass}>
          Straße & Hausnummer
        </label>
        <input
          id="street"
          name="street"
          type="text"
          defaultValue={defaultValues?.street ?? ""}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
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
          <input
            id="city"
            name="city"
            type="text"
            defaultValue={defaultValues?.city ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className={labelClass}>
          Notizen
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaultValues?.notes ?? ""}
          className={inputClass}
        />
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
