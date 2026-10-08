"use client";

import { useEffect, useRef, useState } from "react";
import { loadPdfjs } from "@/lib/pdf/pdfjs";

/** Renders every page of a PDF Blob to canvases with pdf.js. */
export default function PdfViewer({ blob, scale = 1.25 }: { blob: Blob; scale?: number }) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let destroy: (() => void) | undefined;
    const el = host.current;
    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        const task = pdfjs.getDocument({ data: await blob.arrayBuffer() });
        destroy = () => void task.destroy();
        const doc = await task.promise;
        if (cancelled || !el) return;
        el.replaceChildren();
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          if (cancelled) return;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "mx-auto mb-3 max-w-full border border-border-soft shadow-sm";
          el.appendChild(canvas);
          await page.render({ canvas, viewport }).promise;
        }
        setLoading(false);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not render PDF");
      }
    })();
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [blob, scale]);

  return (
    <div>
      {loading && !error && <p className="text-[13.5px] text-muted">Rendering…</p>}
      {error && <p className="text-[13.5px] text-danger">{error}</p>}
      <div ref={host} />
    </div>
  );
}
