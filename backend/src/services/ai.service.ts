import mongoose from "mongoose";
import { AppError } from "../middleware/errorHandler";
import { ChatSession } from "../models/ChatSession";
import { ClinicalRecord } from "../models/ClinicalRecord";
import { Consent } from "../models/Consent";
import { DoctorProfile } from "../models/DoctorProfile";
import { User } from "../models/User";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_REQUEST_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 1;

const SYSTEM_PROMPT = `You are HealthRaahi AI Assistant, an informational health assistant for migrant workers and doctors in India.

Your role:
- Answer general health questions in simple, clear language
- Explain medical terminology in plain terms
- Provide general health education (hygiene, nutrition, common conditions)
- Help users understand the meaning of medical terms they encounter

Strict rules:
- You are NOT a doctor. You do NOT diagnose conditions.
- You do NOT prescribe medication. Never tell a user to start, stop, or change any medication.
- Never recommend specific drugs, dosages, or treatment plans.
- Always encourage the user to consult a qualified healthcare professional for personalized medical advice.
- Clearly identify yourself as an AI assistant in every response when giving health information.
- If a question requires medical judgment, say: "Please consult a healthcare professional for advice specific to your situation."

Keep responses concise (2-4 sentences) and use simple language accessible to someone with limited education.`;

const WORKER_CONTEXT_PREFIX = `The user is a worker asking about their own medical records. Below is relevant clinical record data belonging to this worker. Use it to answer their question when applicable.

IMPORTANT MEDICAL SAFETY RULES:
- Do NOT diagnose conditions based on the records.
- Do NOT prescribe or recommend medication changes.
- Do NOT tell the worker to start, stop, or change any medication.
- Summarize what the records say in plain language the worker can understand.
- Encourage the worker to consult their doctor for medical decisions.
- If the information is not in their records, say so clearly and offer general health information separately.`;

const DOCTOR_CONTEXT_PREFIX = `The user is a verified doctor reviewing a patient's clinical records. Below is the relevant clinical record data for this patient. Use it to assist the doctor's clinical reasoning.

IMPORTANT MEDICAL SAFETY RULES:
- This is an AI-assisted clinical decision support tool. You are NOT making a definitive diagnosis.
- Do NOT independently prescribe medication or recommend changing medication dosages.
- Clearly identify your responses as AI-generated assistance.
- Final clinical decisions remain with the qualified doctor.
- If the records do not contain enough information to answer, state what is missing.
- You may suggest questions the doctor should consider or areas that may need further investigation.`;

const buildGroqHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
});

const buildGroqPayload = (
  messages: { role: string; content: string }[],
  systemOverride?: string
) => ({
  model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  messages: [
    { role: "system", content: systemOverride || SYSTEM_PROMPT },
    ...messages,
  ],
  temperature: 0.7,
  max_tokens: 512,
});

const getWorkerMedicalContext = async (workerId: string): Promise<string> => {
  const records = await ClinicalRecord.find({ workerId })
    .select("recordType category title summary diagnosis prescriptions followUpPlan createdAt")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  if (records.length === 0) {
    return "";
  }

  const lines = records.map((r) => {
    const parts = [
      `- ${r.title} (${r.recordType}, ${r.category}, ${new Date(r.createdAt).toLocaleDateString()})`,
      `  Summary: ${r.summary}`,
    ];
    if (r.diagnosis?.length) parts.push(`  Diagnosis: ${r.diagnosis.join(", ")}`);
    if (r.prescriptions?.length) parts.push(`  Prescriptions: ${r.prescriptions.join(", ")}`);
    if (r.followUpPlan) parts.push(`  Follow-up: ${r.followUpPlan}`);
    return parts.join("\n");
  });

  return `Worker's recent clinical records:\n${lines.join("\n")}`;
};

const validateDoctorAccessForAI = async (doctorId: string): Promise<void> => {
  const doctor = await User.findById(doctorId);
  if (!doctor || doctor.role !== "DOCTOR") {
    throw new AppError("Doctor access required", 403);
  }

  const profile = await DoctorProfile.findOne({ userId: doctorId });
  if (!profile || profile.verificationStatus !== "VERIFIED" || !profile.isVerified) {
    throw new AppError("Doctor account is not verified", 403);
  }
};

const validateConsentForDoctorAI = async (
  doctorId: string,
  workerId: string
): Promise<void> => {
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
    throw new AppError(
      "Active consent is required to access this worker's records for AI assistance",
      403
    );
  }
};

const getDoctorMedicalContext = async (
  doctorId: string,
  workerId: string
): Promise<string> => {
  await validateDoctorAccessForAI(doctorId);
  await validateConsentForDoctorAI(doctorId, workerId);

  const records = await ClinicalRecord.find({ workerId: new mongoose.Types.ObjectId(workerId) })
    .select("recordType category title summary diagnosis prescriptions followUpPlan createdAt")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  if (records.length === 0) {
    return "";
  }

  const lines = records.map((r) => {
    const parts = [
      `- ${r.title} (${r.recordType}, ${r.category}, ${new Date(r.createdAt).toLocaleDateString()})`,
      `  Summary: ${r.summary}`,
    ];
    if (r.diagnosis?.length) parts.push(`  Diagnosis: ${r.diagnosis.join(", ")}`);
    if (r.prescriptions?.length) parts.push(`  Prescriptions: ${r.prescriptions.join(", ")}`);
    if (r.followUpPlan) parts.push(`  Follow-up: ${r.followUpPlan}`);
    return parts.join("\n");
  });

  return `Patient's recent clinical records:\n${lines.join("\n")}`;
};

const extractAssistantReply = (data: any): string => {
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text || typeof text !== "string") return "";
  return text;
};

const callGroqApi = async (
  messages: { role: string; content: string }[],
  systemOverride?: string
): Promise<string> => {
  if (!process.env.GROQ_API_KEY) {
    throw new AppError("AI service is not configured. Please contact the administrator.", 503);
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delayMs = attempt * 1_000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      console.log(`[ai] Retrying Groq call (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GROQ_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: buildGroqHeaders(),
        body: JSON.stringify(buildGroqPayload(messages, systemOverride)),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        console.error(`[ai] Groq API HTTP ${response.status} (attempt ${attempt + 1}):`, errorBody.slice(0, 200));

        if (response.status === 401) {
          throw new AppError("AI service authentication failed. Please contact the administrator.", 503);
        }
        if (response.status === 400) {
          throw new AppError("AI service rejected the request. Please try a shorter message.", 400);
        }

        lastError = new AppError("AI service is temporarily unavailable. Please try again later.", 502);
        continue;
      }

      const data = await response.json();
      const reply = extractAssistantReply(data);

      if (!reply) {
        console.error("[ai] Groq returned empty response:", JSON.stringify(data).slice(0, 200));
        throw new AppError("AI service returned an empty response. Please try again.", 502);
      }

      return reply;
    } catch (error: unknown) {
      clearTimeout(timeout);

      if (error instanceof AppError) throw error;

      const errName = (error as Error)?.name ?? "";
      const errMsg = (error as Error)?.message ?? "";

      if (errName === "AbortError") {
        console.error(`[ai] Groq request timed out after ${GROQ_REQUEST_TIMEOUT_MS}ms (attempt ${attempt + 1})`);
        lastError = new AppError("AI service took too long to respond. Please try a shorter message.", 504);
        continue;
      }

      console.error(`[ai] Groq fetch failed (attempt ${attempt + 1}):`, errMsg);
      lastError = new AppError("AI service is temporarily unavailable. Please try again later.", 502);
    }
  }

  throw lastError;
};

const serializeSession = (session: any) => ({
  id: session._id.toString(),
  userId: session.userId.toString(),
  role: session.role,
  messages: session.messages.map((m: any) => ({
    role: m.role,
    content: m.content,
    timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
  })),
  clinicalRecordId: session.clinicalRecordId
    ? session.clinicalRecordId.toString()
    : null,
  createdAt: session.createdAt instanceof Date ? session.createdAt.toISOString() : session.createdAt,
  updatedAt: session.updatedAt instanceof Date ? session.updatedAt.toISOString() : session.updatedAt,
});

export const createChatSession = async (
  userId: string,
  role: "WORKER" | "DOCTOR",
  input: { clinicalRecordId?: string }
): Promise<Record<string, unknown>> => {
  const sessionData: Record<string, unknown> = {
    userId: new mongoose.Types.ObjectId(userId),
    role,
    messages: [],
  };

  if (input.clinicalRecordId) {
    if (!mongoose.Types.ObjectId.isValid(input.clinicalRecordId)) {
      throw new AppError("Invalid clinical record ID", 400);
    }
    sessionData.clinicalRecordId = new mongoose.Types.ObjectId(
      input.clinicalRecordId
    );
  }

  const session = await ChatSession.create(sessionData);

  return serializeSession(session);
};

export const sendMessage = async (
  userId: string,
  sessionId: string,
  content: string,
  role?: "WORKER" | "DOCTOR",
  workerId?: string
): Promise<Record<string, unknown>> => {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new AppError("Invalid session ID", 400);
  }

  if (!content || !content.trim()) {
    throw new AppError("Message content is required", 400);
  }

  const session = await ChatSession.findById(sessionId);

  if (!session) {
    throw new AppError("Chat session not found", 404);
  }

  if (session.userId.toString() !== userId) {
    throw new AppError("Access denied", 403);
  }

  session.messages.push({
    role: "user",
    content: content.trim(),
    timestamp: new Date(),
  });

  let systemOverride: string | undefined;

  if (role === "WORKER") {
    const context = await getWorkerMedicalContext(userId);
    if (context) {
      systemOverride = `${SYSTEM_PROMPT}\n\n${WORKER_CONTEXT_PREFIX}\n\n${context}`;
    }
  } else if (role === "DOCTOR" && workerId) {
    const context = await getDoctorMedicalContext(userId, workerId);
    if (context) {
      systemOverride = `${SYSTEM_PROMPT}\n\n${DOCTOR_CONTEXT_PREFIX}\n\n${context}`;
    }
  }

  const historyForApi = session.messages.map((m: any) => ({
    role: m.role,
    content: m.content,
  }));

  const assistantReply = await callGroqApi(historyForApi, systemOverride);

  session.messages.push({
    role: "assistant",
    content: assistantReply,
    timestamp: new Date(),
  });

  await session.save();

  return serializeSession(session);
};

export const getChatSession = async (
  userId: string,
  sessionId: string
): Promise<Record<string, unknown>> => {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new AppError("Invalid session ID", 400);
  }

  const session = await ChatSession.findById(sessionId);

  if (!session) {
    throw new AppError("Chat session not found", 404);
  }

  if (session.userId.toString() !== userId) {
    throw new AppError("Access denied", 403);
  }

  return serializeSession(session);
};

export const listChatSessions = async (
  userId: string
): Promise<Record<string, unknown>[]> => {
  const sessions = await ChatSession.find({ userId }).sort({ updatedAt: -1 });

  return sessions.map(serializeSession);
};
