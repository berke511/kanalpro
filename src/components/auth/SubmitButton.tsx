"use client";

import { useFormStatus } from "react-dom";
import { ArrowRight, Loader2 } from "lucide-react";

export function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-dark px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition hover:shadow-xl hover:shadow-brand/30 hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-80"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {pendingLabel ?? "Wird geladen…"}
        </>
      ) : (
        <>
          {label}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </>
      )}
    </button>
  );
}
