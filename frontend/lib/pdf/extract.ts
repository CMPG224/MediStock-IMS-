import { loadPdfjs } from "./pdfjs";

/** Plain text of every page, lines rebuilt from pdf.js text runs. */
export async function extractPdfText(file: File | ArrayBuffer): Promise<string[]> {
  const pdfjs = await loadPdfjs();
  const data = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const task = pdfjs.getDocument({ data });
  const doc = await task.promise;
  try {
    const pages: string[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const content = await (await doc.getPage(n)).getTextContent();
      let text = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        text += item.str + (item.hasEOL ? "\n" : " ");
      }
      pages.push(text.trim());
    }
    return pages;
  } finally {
    void task.destroy();
  }
}
