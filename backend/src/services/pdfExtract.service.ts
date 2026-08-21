import { AppError } from "../middleware/errorHandler";

const MAX_EXTRACTABLE_CHARS = 12_000;

export interface PdfExtractResult {
  text: string;
  numPages: number;
  isTruncated: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (
  buffer: Buffer,
  options?: Record<string, unknown>
) => Promise<{ text: string; numpages: number }>;

export async function extractTextFromPdf(buffer: Buffer): Promise<PdfExtractResult> {
  if (!buffer || buffer.length === 0) {
    throw new AppError("Empty PDF buffer — no content to extract", 400);
  }

  let result: { text: string; numpages: number };
  try {
    result = await pdfParse(buffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[pdf] Extraction failed:", msg.slice(0, 200));
    throw new AppError("Unable to read this PDF. The file may be corrupted or password-protected.", 400);
  }

  const rawText: string = result?.text || "";
  const numPages: number = result?.numpages || 0;
  const cleaned = rawText.replace(/\s+/g, " ").trim();

  if (!cleaned) {
    throw new AppError(
      "No readable text found in this PDF. It may be a scanned image or contain only graphics.",
      422
    );
  }

  const isTruncated = cleaned.length > MAX_EXTRACTABLE_CHARS;
  const text = isTruncated ? cleaned.slice(0, MAX_EXTRACTABLE_CHARS) : cleaned;

  return { text, numPages, isTruncated };
}

export function isPdfMimeType(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

export function isImageMimeType(mimeType: string): boolean {
  return mimeType === "image/jpeg" || mimeType === "image/jpg" || mimeType === "image/png";
}
