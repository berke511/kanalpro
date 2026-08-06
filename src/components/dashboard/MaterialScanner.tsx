"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, QrCode, X } from "lucide-react";

// Browser-natives BarcodeDetector-API wird noch nicht von allen Browsern
// unterstützt (v. a. Safari/Firefox fehlt sie aktuell) – deshalb immer eine
// manuelle Code-Eingabe als Fallback anbieten, die Kamera-Erkennung ist ein
// zusätzlicher Komfort, wenn die API verfügbar ist.
type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
};

export function MaterialScanner() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  // Lazy-Initialisierung statt Effekt: die Prüfung liest nur eine statische
  // Browser-Fähigkeit und muss daher nicht bei jedem Render neu synchronisiert
  // werden (vermeidet ein setState direkt im Effekt-Body).
  const [supportsDetector] = useState(() => typeof window !== "undefined" && "BarcodeDetector" in window);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function submitCode(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;
    stopCamera();
    setOpen(false);
    router.push(`/material?scan=${encodeURIComponent(trimmed)}`);
  }

  function stopCamera() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }

  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      if (supportsDetector) {
        const Detector = (window as unknown as { BarcodeDetector: new (options: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
        const detector = new Detector({ formats: ["qr_code", "code_128", "ean_13", "code_39"] });
        intervalRef.current = setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const results = await detector.detect(videoRef.current);
            if (results.length > 0) {
              submitCode(results[0].rawValue);
            }
          } catch {
            // Einzelne Frames können fehlschlagen (z. B. während des
            // Fokussierens) – das ist erwartet und wird ignoriert.
          }
        }, 400);
      }
    } catch {
      setCameraError("Kamera konnte nicht gestartet werden. Bitte Code manuell eingeben.");
    }
  }

  useEffect(() => {
    if (!open) stopCamera();
    return () => stopCamera();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-background sm:py-2"
      >
        <QrCode className="h-4 w-4" />
        Scannen
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-sm -translate-y-1/2 rounded-2xl border border-border bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">QR-/Barcode scannen</h3>
              <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-muted hover:bg-background hover:text-foreground" aria-label="Schließen">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {cameraActive ? (
                <video ref={videoRef} className="aspect-video w-full rounded-xl bg-black object-cover" muted playsInline />
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background py-6 text-sm font-medium text-muted hover:bg-brand-soft/40"
                >
                  <Camera className="h-4 w-4" />
                  Kamera starten
                </button>
              )}
              {cameraError && <p className="text-xs text-red-600">{cameraError}</p>}
              {cameraActive && !supportsDetector && (
                <p className="text-xs text-muted">Automatische Erkennung wird von diesem Browser nicht unterstützt – bitte den Code manuell eingeben.</p>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitCode(manualCode);
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Materialnummer / Code eingeben"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
                />
                <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                  Los
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
