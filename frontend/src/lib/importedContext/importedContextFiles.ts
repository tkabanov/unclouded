/**
 * NCLDD-63 — read raw text from files the user imports. Nothing is uploaded: files are read in the
 * browser and only the resulting text is saved (after preview, edit and consent).
 */

export const IMPORTED_CONTEXT_FILE_ACCEPT = ".txt,.md,.markdown,.json,.csv,.pdf";
export const IMPORTED_CONTEXT_MAX_FILE_BYTES = 5 * 1024 * 1024;

const TEXT_EXTENSIONS = new Set(["txt", "md", "markdown", "json", "csv"]);

export type ImportedFileText = {
  fileName: string;
  text: string;
  error?: string;
};

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

/** Collapses runs of blank lines and trailing spaces; keeps the text otherwise as-is. */
export function normalizeImportedText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Appends imported text to the draft, one paragraph per source. */
export function appendImportedText(draft: string, files: ImportedFileText[]): string {
  const parts = files
    .filter((file) => file.text)
    .map((file) => `[From ${file.fileName}]\n${file.text}`);
  return [draft.trim(), ...parts].filter(Boolean).join("\n\n");
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

async function readPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const doc = await pdfjs.getDocument({ data: await readAsArrayBuffer(file) }).promise;
  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const line = content.items
        .map((item) => ("str" in item ? `${item.str}${item.hasEOL ? "\n" : ""}` : ""))
        .join("");
      pages.push(line);
    }
    return pages.join("\n\n");
  } finally {
    void doc.destroy();
  }
}

export async function readImportedFile(file: File): Promise<ImportedFileText> {
  const extension = extensionOf(file.name);
  if (file.size > IMPORTED_CONTEXT_MAX_FILE_BYTES) {
    return { fileName: file.name, text: "", error: "File is larger than 5 MB." };
  }
  try {
    if (extension === "pdf") {
      return { fileName: file.name, text: normalizeImportedText(await readPdfText(file)) };
    }
    if (TEXT_EXTENSIONS.has(extension)) {
      return { fileName: file.name, text: normalizeImportedText(await readAsText(file)) };
    }
    return { fileName: file.name, text: "", error: "Unsupported file type." };
  } catch {
    return { fileName: file.name, text: "", error: "Couldn't read this file." };
  }
}
