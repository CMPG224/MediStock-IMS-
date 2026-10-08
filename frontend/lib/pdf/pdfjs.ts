/** Lazy pdf.js loader — client only, so the ~1MB library stays out of the server bundle. */
let loaded: Promise<typeof import("pdfjs-dist")> | null = null;

export function loadPdfjs() {
  loaded ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    return pdfjs;
  });
  return loaded;
}
