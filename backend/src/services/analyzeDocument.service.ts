import mongoose from "mongoose";
import { AppError } from "../middleware/errorHandler";
import { WorkerHealthDocument } from "../models/WorkerHealthDocument";
import { ClinicalRecordDocument } from "../models/ClinicalRecordDocument";
import { Consent } from "../models/Consent";
import { DoctorProfile } from "../models/DoctorProfile";
import { User } from "../models/User";
import { downloadFile, downloadFileFromBucket, BUCKET_NAME } from "../utils/gridfsStorage";
import { extractTextFromPdf, isPdfMimeType, isImageMimeType } from "./pdfExtract.service";
import { Readable } from "stream";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_REQUEST_TIMEOUT_MS = 25_000;

const WORKER_ANALYSIS_PROMPT = `You are HealthRaahi AI Assistant, an informational health assistant for migrant workers in India.

The user (a worker) has uploaded a medical report/document and wants you to analyze it.

INSTRUCTIONS:
1. Identify what type of report this is (lab report, prescription, X-ray, discharge summary, etc.).
2. Highlight what looks NORMAL vs what looks ABNORMAL — use simple language like "This value is higher/lower than usual."
3. Explain important medical terms in plain language the worker can understand.
4. Summarize key findings in 3-5 bullet points.
5. Provide clear next-step guidance: whether they should discuss the result with a doctor, any urgent findings, and what questions to ask.
6. Use simple language accessible to someone with limited education.

STRICT RULES:
- You are NOT a doctor. You do NOT diagnose conditions.
- You do NOT prescribe or recommend medication changes.
- Always encourage the user to consult a healthcare professional.
- Include this disclaimer at the end: "This is an AI-generated summary for informational purposes only. Please consult a healthcare professional for medical advice."`;

const DOCTOR_ANALYSIS_PROMPT = `You are HealthRaahi Clinical AI Assistant, providing clinical decision support for verified doctors.

INSTRUCTIONS:
1. Identify the document type and provide a structured clinical summary.
2. List key findings with specific values where available.
3. Identify all abnormal parameters with their deviation from normal ranges.
4. Note any trends if multiple data points are present.
5. Provide clinical considerations — possible implications the doctor should evaluate.
6. Suggest areas that may need further investigation if applicable.
7. Give a concise professional impression/summary.

STRICT RULES:
- You are an AI-assisted clinical decision support tool. You are NOT making a definitive diagnosis.
- Do NOT independently prescribe medication or recommend changing medication dosages.
- Clearly identify your responses as AI-generated assistance.
- Final clinical decisions remain with the qualified doctor.
- Include this disclaimer: "This AI-generated analysis is for clinical decision support only and does not constitute a definitive diagnosis or treatment recommendation."`;

const ANALYSIS_ACTION_PROMPTS: Record<string, { label: string; instruction: string }> = {
  analyze: {
    label: "Analyze this report",
    instruction: "Perform a comprehensive analysis of this medical report. Identify the document type, extract key values, and explain findings clearly.",
  },
  abnormal: {
    label: "Explain abnormal values",
    instruction: "Focus on identifying and explaining all abnormal values in this report. For each abnormal finding, explain what it means and whether it requires attention.",
  },
  summarize: {
    label: "Summarize report",
    instruction: "Provide a concise summary of this medical report — what it is, the main findings, and the overall picture in 3-5 clear bullet points.",
  },
  questions: {
    label: "What should I discuss with my doctor?",
    instruction: "Based on this report, list the key questions and topics the user should discuss with their doctor. Highlight any urgent concerns.",
  },
};

const buildGroqHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
});

const callGroqApi = async (messages: { role: string; content: string }[], systemPrompt: string): Promise<string> => {
  if (!process.env.GROQ_API_KEY) {
    throw new AppError("AI service is not configured. Please contact the administrator.", 503);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GROQ_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: buildGroqHeaders(),
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.5,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error(`[ai] Groq document-analysis HTTP ${response.status}:`, errorBody.slice(0, 200));

      if (response.status === 401) {
        throw new AppError("AI service authentication failed. Please contact the administrator.", 503);
      }
      if (response.status === 429) {
        throw new AppError("AI service rate limit reached. Please try again in a moment.", 429);
      }

      throw new AppError("AI service is temporarily unavailable. Please try again later.", 502);
    }

    const data: any = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new AppError("AI service returned an empty response. Please try again.", 502);
    }

    return text;
  } catch (error: unknown) {
    clearTimeout(timeout);

    if (error instanceof AppError) throw error;

    const errName = (error as Error)?.name ?? "";
    if (errName === "AbortError") {
      throw new AppError("AI service took too long to respond. Please try again.", 504);
    }

    throw new AppError("AI service is temporarily unavailable. Please try again later.", 502);
  }
};

const streamToBuffer = (stream: Readable): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
};

const getWorkerDocumentForAnalysis = async (
  documentId: string,
  workerId: string
): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> => {
  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    throw new AppError("Invalid document ID", 400);
  }

  const doc = await WorkerHealthDocument.findById(documentId);
  if (!doc) {
    throw new AppError("Document not found", 404);
  }

  if (doc.workerId.toString() !== workerId) {
    throw new AppError("Access denied", 403);
  }

  if (!isPdfMimeType(doc.mimeType) && !isImageMimeType(doc.mimeType)) {
    throw new AppError(
      `Unsupported file type "${doc.mimeType}" for analysis. Only PDF and image files can be analyzed.`,
      400
    );
  }

  const { stream } = await downloadFile(doc.gridfsFileId);
  const buffer = await streamToBuffer(stream);

  return { buffer, mimeType: doc.mimeType, fileName: doc.originalFileName };
};

const getDoctorDocumentForAnalysis = async (
  documentId: string,
  doctorId: string,
  workerId?: string
): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> => {
  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    throw new AppError("Invalid document ID", 400);
  }

  const doc = await ClinicalRecordDocument.findById(documentId);
  if (!doc) {
    throw new AppError("Document not found", 404);
  }

  const doctor = await User.findById(doctorId);
  if (!doctor || doctor.role !== "DOCTOR") {
    throw new AppError("Doctor access required", 403);
  }

  const profile = await DoctorProfile.findOne({ userId: doctorId });
  if (!profile || profile.verificationStatus !== "VERIFIED" || !profile.isVerified) {
    throw new AppError("Doctor account is not verified", 403);
  }

  const now = new Date();
  const consent = await Consent.findOne({
    workerId: doc.workerId,
    doctorId: new mongoose.Types.ObjectId(doctorId),
    status: "APPROVED",
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    categories: { $in: ["MEDICAL_RECORDS"] },
  }).sort({ createdAt: -1 });

  if (!consent) {
    throw new AppError("Active consent is required to analyze this document", 403);
  }

  if (!isPdfMimeType(doc.mimeType) && !isImageMimeType(doc.mimeType)) {
    throw new AppError(
      `Unsupported file type "${doc.mimeType}" for analysis. Only PDF and image files can be analyzed.`,
      400
    );
  }

  const { stream } = await downloadFileFromBucket(BUCKET_NAME, doc.gridfsFileId);
  const buffer = await streamToBuffer(stream);

  return { buffer, mimeType: doc.mimeType, fileName: doc.originalFileName };
};

const validateDoctorForListing = async (doctorId: string, workerId: string): Promise<void> => {
  const doctor = await User.findById(doctorId);
  if (!doctor || doctor.role !== "DOCTOR") {
    throw new AppError("Doctor access required", 403);
  }

  const profile = await DoctorProfile.findOne({ userId: doctorId });
  if (!profile || profile.verificationStatus !== "VERIFIED" || !profile.isVerified) {
    throw new AppError("Doctor account is not verified", 403);
  }

  const now = new Date();
  const consent = await Consent.findOne({
    workerId: new mongoose.Types.ObjectId(workerId),
    doctorId: new mongoose.Types.ObjectId(doctorId),
    status: "APPROVED",
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    categories: { $in: ["MEDICAL_RECORDS"] },
  }).sort({ createdAt: -1 });

  if (!consent) {
    throw new AppError("Active consent is required to access this worker's documents", 403);
  }
};

export const listDocumentsForAnalysis = async (
  userId: string,
  role: "WORKER" | "DOCTOR",
  workerId?: string
): Promise<Record<string, unknown>[]> => {
  if (role === "WORKER") {
    const docs = await WorkerHealthDocument.find({
      workerId: new mongoose.Types.ObjectId(userId),
      mimeType: { $in: ["application/pdf", "image/jpeg", "image/jpg", "image/png"] },
    }).sort({ createdAt: -1 }).limit(20);

    return docs.map((doc) => ({
      id: doc._id.toString(),
      fileName: doc.originalFileName,
      documentType: doc.documentType,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      uploadedAt: doc.createdAt.toISOString(),
      source: "worker-document",
    }));
  }

  if (role === "DOCTOR") {
    if (!workerId || !mongoose.Types.ObjectId.isValid(workerId)) {
      return [];
    }

    await validateDoctorForListing(userId, workerId);

    const docs = await ClinicalRecordDocument.find({
      workerId: new mongoose.Types.ObjectId(workerId),
      mimeType: { $in: ["application/pdf", "image/jpeg", "image/jpg", "image/png"] },
    }).sort({ createdAt: -1 }).limit(20);

    return docs.map((doc) => ({
      id: doc._id.toString(),
      fileName: doc.originalFileName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      uploadedAt: doc.createdAt.toISOString(),
      source: "clinical-record-document",
    }));
  }

  return [];
};

export const analyzeDocument = async (
  userId: string,
  role: "WORKER" | "DOCTOR",
  documentId: string,
  action: string = "analyze",
  workerId?: string
): Promise<Record<string, unknown>> => {
  const actionConfig = ANALYSIS_ACTION_PROMPTS[action];
  if (!actionConfig) {
    throw new AppError(
      `Invalid analysis action "${action}". Valid actions: ${Object.keys(ANALYSIS_ACTION_PROMPTS).join(", ")}`,
      400
    );
  }

  let docInfo: { buffer: Buffer; mimeType: string; fileName: string };

  if (role === "WORKER") {
    docInfo = await getWorkerDocumentForAnalysis(documentId, userId);
  } else {
    docInfo = await getDoctorDocumentForAnalysis(documentId, userId, workerId);
  }

  if (isPdfMimeType(docInfo.mimeType)) {
    const { text, numPages, isTruncated } = await extractTextFromPdf(docInfo.buffer);

    const truncationNote = isTruncated
      ? "\n\n[Note: The document was truncated due to length. Analysis may be incomplete.]"
      : "";

    const messages = [
      {
        role: "user",
        content: `ACTION: ${actionConfig.instruction}\n\nDocument: ${docInfo.fileName} (${numPages} pages)\n\n--- Document Text ---\n${text}${truncationNote}`,
      },
    ];

    const systemPrompt = role === "WORKER" ? WORKER_ANALYSIS_PROMPT : DOCTOR_ANALYSIS_PROMPT;
    const analysis = await callGroqApi(messages, systemPrompt);

    return {
      documentId,
      fileName: docInfo.fileName,
      mimeType: docInfo.mimeType,
      action,
      actionLabel: actionConfig.label,
      analysis,
      pages: numPages,
      truncated: isTruncated,
    };
  }

  if (isImageMimeType(docInfo.mimeType)) {
    const messages = [
      {
        role: "user",
        content: `ACTION: ${actionConfig.instruction}\n\nDocument: ${docInfo.fileName} (image file — ${docInfo.mimeType})\n\nNote: I cannot read the image content directly, but based on the document metadata, please provide what guidance you can about analyzing this type of medical image/document, and explain what a user should look for or discuss with their doctor.`,
      },
    ];

    const systemPrompt = role === "WORKER" ? WORKER_ANALYSIS_PROMPT : DOCTOR_ANALYSIS_PROMPT;
    const analysis = await callGroqApi(messages, systemPrompt);

    return {
      documentId,
      fileName: docInfo.fileName,
      mimeType: docInfo.mimeType,
      action,
      actionLabel: actionConfig.label,
      analysis,
      imageNote: "AI text extraction from images is not yet available. The analysis is based on document type guidance only.",
    };
  }

  throw new AppError("Unsupported file type for analysis", 400);
};
