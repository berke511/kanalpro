"use client";

// Digitales Unterschriften-Pad (Maus/Finger/Stift via Pointer Events).
// Wird sowohl im Assistenten (ReportWizard, Schritt "Kunde") als auch im
// Detailpanel (ReportDetailPanel, Tab "Unterschrift") verwendet. Schreibt
// das gezeichnete Bild als Base64-PNG in ein verstecktes Formularfeld
// (gleiches "hidden input trägt abgeleiteten Wert"-Muster wie category/unit
// im MaterialWizard), das serverseitig decodiert und in den privaten
// Storage-Bucket "report-signatures" hochgeladen wird.

import { useRef, useState } from "react";

export function SignaturePad({ name, height = 160 }: { name: string; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const drawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  }

  function syncValue() {
    const canvas = canvasRef.current;
    if (!canvas || !hiddenRef.current) return;
    hiddenRef.current.value = canvas.toDataURL("image/png");
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    drawing.current = true;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function handlePointerUp() {
    if (!drawing.current) return;
    drawing.current = false;
    setHasSignature(true);
    syncValue();
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    if (hiddenRef.current) hiddenRef.current.value = "";
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-dashed border-border bg-background">
        <canvas
          ref={canvasRef}
          width={600}
          height={height}
          className="block h-40 w-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-muted">{hasSignature ? "Unterschrift erfasst" : "Mit Maus, Finger oder Stift unterschreiben"}</p>
        <button type="button" onClick={clear} className="text-xs font-medium text-muted hover:text-foreground">
          Löschen
        </button>
      </div>
      <input ref={hiddenRef} type="hidden" name={name} />
    </div>
  );
}
