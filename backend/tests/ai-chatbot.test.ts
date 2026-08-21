import mongoose from "mongoose";
import { vi } from "vitest";
import request from "supertest";
import app from "../src/app";
import { connectDatabase, disconnectDatabase } from "../src/config/database";
import { ChatSession } from "../src/models/ChatSession";
import { ClinicalRecord } from "../src/models/ClinicalRecord";
import { Consent } from "../src/models/Consent";
import { DoctorProfile } from "../src/models/DoctorProfile";
import { DoctorVerificationDocument } from "../src/models/DoctorVerificationDocument";
import { User } from "../src/models/User";
import { signToken } from "../src/utils/jwt";
import { stopMongoMemoryServer } from "./setup";

const mockGroqResponse = (content: string) => ({
  ok: true,
  json: async () => ({
    choices: [{ message: { content } }],
  }),
});

describe("AI Health Assistant", () => {
  const originalFetch = global.fetch;

  beforeAll(async () => {
    await connectDatabase();
  });

  beforeEach(async () => {
    process.env.GROQ_API_KEY = "test-groq-key";
    await User.deleteMany({});
    await ChatSession.deleteMany({});
    await ClinicalRecord.deleteMany({});
    await Consent.deleteMany({});
    await DoctorProfile.deleteMany({});
    await DoctorVerificationDocument.deleteMany({});
    global.fetch = vi.fn().mockResolvedValue(
      mockGroqResponse(
        "I can help you with that. Please consult a healthcare professional for personalized advice."
      )
    );
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    await disconnectDatabase();
    await stopMongoMemoryServer();
  });

  const registerUser = async (payload: {
    name: string;
    phone: string;
    password: string;
    role: "WORKER" | "DOCTOR" | "ADMIN";
  }) => {
    const res = await request(app).post("/api/auth/register").send(payload);
    expect(res.status).toBe(201);
    return res.body.data.user;
  };

  const loginUser = async (payload: { phone: string; password: string }) => {
    const res = await request(app).post("/api/auth/login").send(payload);
    expect(res.status).toBe(200);
    return res.body.data;
  };

  const createWorker = async (phone = "9100000001") => {
    const worker = await registerUser({
      name: "Test Worker",
      phone,
      password: "Worker@1234",
      role: "WORKER",
    });
    const { token } = await loginUser({ phone, password: "Worker@1234" });
    return { worker, token };
  };

  const createDoctor = async (phone = "9100000002") => {
    const doctor = await registerUser({
      name: "Dr. Test",
      phone,
      password: "Doctor@1234",
      role: "DOCTOR",
    });
    const { token } = await loginUser({ phone, password: "Doctor@1234" });
    return { doctor, token };
  };

  const createVerifiedDoctor = async (
    phone = "9100000003",
    adminPhone = "9100000099"
  ) => {
    const doctor = await registerUser({
      name: "Dr. Verified",
      phone,
      password: "Doctor@1234",
      role: "DOCTOR",
    });

    const doctorToken = signToken({ userId: doctor.id, role: doctor.role });

    await request(app)
      .patch("/api/doctors/profile/me")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        fullName: "Dr. Verified",
        specialization: "General Medicine",
        medicalRegistrationNumber: `MED-${phone.slice(-4)}`,
        phone,
      });

    const profile = await DoctorProfile.findOne({ userId: doctor.id });

    await DoctorVerificationDocument.insertMany([
      {
        doctorUserId: doctor.id,
        documentType: "MEDICAL_COUNCIL_REGISTRATION",
        fileName: "mcr.pdf",
        originalName: "mcr.pdf",
        mimeType: "application/pdf",
        fileSize: 1024,
        gridfsFileId: new mongoose.Types.ObjectId(),
        status: "APPROVED",
      },
      {
        doctorUserId: doctor.id,
        documentType: "IDENTITY_PROOF",
        fileName: "id.pdf",
        originalName: "id.pdf",
        mimeType: "application/pdf",
        fileSize: 1024,
        gridfsFileId: new mongoose.Types.ObjectId(),
        status: "APPROVED",
      },
      {
        doctorUserId: doctor.id,
        documentType: "QUALIFICATION_CERTIFICATE",
        fileName: "qual.pdf",
        originalName: "qual.pdf",
        mimeType: "application/pdf",
        fileSize: 1024,
        gridfsFileId: new mongoose.Types.ObjectId(),
        status: "APPROVED",
      },
    ]);

    const admin = await registerUser({
      name: "Admin",
      phone: adminPhone,
      password: "Admin@1234",
      role: "ADMIN",
    });
    const adminToken = signToken({ userId: admin.id, role: admin.role });

    await request(app)
      .patch(`/api/doctors/${profile!.doctorId}/verify`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "VERIFIED", reason: "Test" });

    return { doctor, token: doctorToken };
  };

  const createApprovedConsent = async (
    doctorId: string,
    workerId: string
  ) => {
    return Consent.create({
      workerId: new mongoose.Types.ObjectId(workerId),
      doctorId: new mongoose.Types.ObjectId(doctorId),
      categories: ["MEDICAL_RECORDS"],
      purpose: "Treatment",
      status: "APPROVED",
      validFrom: new Date(Date.now() - 86400000),
      validUntil: new Date(Date.now() + 86400000 * 30),
    });
  };

  const createSession = async (token: string) => {
    const res = await request(app)
      .post("/api/ai/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    return res.body.data.session;
  };

  describe("POST /api/ai/sessions", () => {
    it("allows authenticated worker to create a chat session", async () => {
      const { token } = await createWorker();

      const res = await request(app)
        .post("/api/ai/sessions")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.session).toBeDefined();
      expect(res.body.data.session.id).toBeDefined();
      expect(res.body.data.session.role).toBe("WORKER");
      expect(res.body.data.session.messages).toEqual([]);
      expect(res.body.data.session.clinicalRecordId).toBeNull();
    });

    it("allows authenticated doctor to create a chat session", async () => {
      const { token } = await createDoctor();

      const res = await request(app)
        .post("/api/ai/sessions")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.session).toBeDefined();
      expect(res.body.data.session.role).toBe("DOCTOR");
      expect(res.body.data.session.messages).toEqual([]);
    });

    it("rejects unauthenticated session creation", async () => {
      const res = await request(app)
        .post("/api/ai/sessions")
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("creates session with optional clinicalRecordId", async () => {
      const { token } = await createWorker();
      const fakeRecordId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post("/api/ai/sessions")
        .set("Authorization", `Bearer ${token}`)
        .send({ clinicalRecordId: fakeRecordId });

      expect(res.status).toBe(201);
      expect(res.body.data.session.clinicalRecordId).toBe(fakeRecordId);
    });
  });

  describe("POST /api/ai/sessions/:id/messages", () => {
    it("sends a message and receives an AI response", async () => {
      const { token } = await createWorker();
      const session = await createSession(token);

      (global.fetch as any).mockResolvedValueOnce(
        mockGroqResponse(
          "Headaches can have many causes including stress, dehydration, or lack of sleep. If your headache is severe or persistent, please consult a healthcare professional."
        )
      );

      const res = await request(app)
        .post(`/api/ai/sessions/${session.id}/messages`)
        .set("Authorization", `Bearer ${token}`)
        .send({ content: "I have a headache" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.session.messages).toHaveLength(2);
      expect(res.body.data.session.messages[0].role).toBe("user");
      expect(res.body.data.session.messages[0].content).toBe("I have a headache");
      expect(res.body.data.session.messages[1].role).toBe("assistant");
      expect(res.body.data.session.messages[1].content).toContain("headache");
      expect(res.body.data.session.messages[1].content).toContain("consult");
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("rejects empty message content", async () => {
      const { token } = await createWorker();
      const session = await createSession(token);

      const res = await request(app)
        .post(`/api/ai/sessions/${session.id}/messages`)
        .set("Authorization", `Bearer ${token}`)
        .send({ content: "" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("rejects message to non-existent session", async () => {
      const { token } = await createWorker();
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .post(`/api/ai/sessions/${fakeId}/messages`)
        .set("Authorization", `Bearer ${token}`)
        .send({ content: "Hello" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("rejects unauthenticated message sending", async () => {
      const res = await request(app)
        .post("/api/ai/sessions/fakeId/messages")
        .send({ content: "Hello" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("returns 503 when GROQ_API_KEY is missing", async () => {
      const { token } = await createWorker();
      const session = await createSession(token);

      const originalKey = process.env.GROQ_API_KEY;
      delete process.env.GROQ_API_KEY;

      const res = await request(app)
        .post(`/api/ai/sessions/${session.id}/messages`)
        .set("Authorization", `Bearer ${token}`)
        .send({ content: "What is diabetes?" });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);

      process.env.GROQ_API_KEY = originalKey || "";
    });

    it("returns 502 when Groq API returns an error", async () => {
      const { token } = await createWorker();
      const session = await createSession(token);

      const mockErrorResponse = {
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      };
      (global.fetch as any)
        .mockResolvedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce(mockErrorResponse);

      const res = await request(app)
        .post(`/api/ai/sessions/${session.id}/messages`)
        .set("Authorization", `Bearer ${token}`)
        .send({ content: "What is blood pressure?" });

      expect(res.status).toBe(502);
      expect(res.body.success).toBe(false);
    });

    it("returns 502 when Groq returns an empty response", async () => {
      const { token } = await createWorker();
      const session = await createSession(token);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [] }),
      });

      const res = await request(app)
        .post(`/api/ai/sessions/${session.id}/messages`)
        .set("Authorization", `Bearer ${token}`)
        .send({ content: "Explain hypertension" });

      expect(res.status).toBe(502);
      expect(res.body.success).toBe(false);
    });

    it("returns 504 when Groq API times out", async () => {
      const { token } = await createWorker();
      const session = await createSession(token);

      const abortError = Object.assign(new Error("Aborted"), { name: "AbortError" });
      (global.fetch as any)
        .mockRejectedValueOnce(abortError)
        .mockRejectedValueOnce(abortError);

      const res = await request(app)
        .post(`/api/ai/sessions/${session.id}/messages`)
        .set("Authorization", `Bearer ${token}`)
        .send({ content: "What are normal blood sugar levels?" });

      expect(res.status).toBe(504);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/ai/sessions/:id", () => {
    it("allows user to retrieve own session", async () => {
      const { token } = await createWorker();
      const session = await createSession(token);

      const res = await request(app)
        .get(`/api/ai/sessions/${session.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.session.id).toBe(session.id);
    });

    it("rejects access to another user's session", async () => {
      const { token: workerToken } = await createWorker("9100000010");
      const { token: doctorToken } = await createDoctor("9100000011");

      const session = await createSession(workerToken);

      const res = await request(app)
        .get(`/api/ai/sessions/${session.id}`)
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("rejects unauthenticated session retrieval", async () => {
      const { token } = await createWorker();
      const session = await createSession(token);

      const res = await request(app)
        .get(`/api/ai/sessions/${session.id}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/ai/sessions", () => {
    it("allows user to list own sessions", async () => {
      const { token } = await createWorker();

      await createSession(token);
      await createSession(token);

      const res = await request(app)
        .get("/api/ai/sessions")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sessions).toHaveLength(2);
    });

    it("does not show other users' sessions", async () => {
      const { token: workerToken } = await createWorker("9100000020");
      const { token: doctorToken } = await createDoctor("9100000021");

      await createSession(workerToken);

      const res = await request(app)
        .get("/api/ai/sessions")
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.sessions).toHaveLength(0);
    });
  });

  describe("Worker medical record context", () => {
    const createClinicalRecord = async (
      workerId: string,
      overrides: Partial<{
        recordType: string;
        category: string;
        title: string;
        summary: string;
        diagnosis: string[];
        prescriptions: string[];
        followUpPlan: string;
      }> = {}
    ) => {
      return ClinicalRecord.create({
        workerId: new mongoose.Types.ObjectId(workerId),
        doctorId: new mongoose.Types.ObjectId(),
        consentId: new mongoose.Types.ObjectId(),
        recordType: overrides.recordType || "CONSULTATION",
        category: overrides.category || "General Medicine",
        title: overrides.title || "General Checkup",
        summary: overrides.summary || "Routine checkup",
        details: {},
        diagnosis: overrides.diagnosis || [],
        prescriptions: overrides.prescriptions || [],
        followUpPlan: overrides.followUpPlan || null,
      });
    };

    it("injects worker's own clinical records into AI context", async () => {
      const { worker, token } = await createWorker("9100000030");

      await createClinicalRecord(worker.id, {
        recordType: "DIAGNOSIS",
        category: "Diabetes",
        title: "Type 2 Diabetes Diagnosis",
        summary: "Blood sugar levels elevated at 180 mg/dL",
        diagnosis: ["Type 2 Diabetes Mellitus"],
        prescriptions: ["Metformin 500mg twice daily"],
        followUpPlan: "Follow up in 3 months with HbA1c test",
      });

      const session = await createSession(token);

      (global.fetch as any).mockResolvedValueOnce(
        mockGroqResponse(
          "Based on your records, you have been diagnosed with Type 2 Diabetes and are taking Metformin. Please consult your doctor for any medication changes."
        )
      );

      const res = await request(app)
        .post(`/api/ai/sessions/${session.id}/messages`)
        .set("Authorization", `Bearer ${token}`)
        .send({ content: "What is my latest diagnosis?" });

      expect(res.status).toBe(200);
      expect(res.body.data.session.messages[1].content).toContain("diagnosed");

      const fetchCall = (global.fetch as any).mock.calls[0];
      const payload = JSON.parse(fetchCall[1].body);
      const systemMsg = payload.messages[0].content;
      expect(systemMsg).toContain("Type 2 Diabetes");
      expect(systemMsg).toContain("Metformin");
      expect(systemMsg).toContain("clinical records");
    });

    it("does not include other workers' records in context", async () => {
      const { worker: workerA, token: tokenA } = await createWorker("9100000040");
      const { worker: workerB } = await createWorker("9100000041");

      await createClinicalRecord(workerA.id, {
        title: "Worker A Record",
        summary: "Worker A health data",
      });

      await createClinicalRecord(workerB.id, {
        title: "Worker B Record",
        summary: "Worker B health data",
      });

      const sessionA = await createSession(tokenA);

      const res = await request(app)
        .post(`/api/ai/sessions/${sessionA.id}/messages`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ content: "What are my records?" });

      expect(res.status).toBe(200);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const payload = JSON.parse(fetchCall[1].body);
      const systemMsg = payload.messages[0].content;
      expect(systemMsg).toContain("Worker A Record");
      expect(systemMsg).not.toContain("Worker B Record");
      expect(systemMsg).not.toContain("Worker B health data");
    });

    it("works without clinical records (no context injected)", async () => {
      const { token } = await createWorker("9100000050");
      const session = await createSession(token);

      const res = await request(app)
        .post(`/api/ai/sessions/${session.id}/messages`)
        .set("Authorization", `Bearer ${token}`)
        .send({ content: "What is diabetes?" });

      expect(res.status).toBe(200);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const payload = JSON.parse(fetchCall[1].body);
      const systemMsg = payload.messages[0].content;
      expect(systemMsg).not.toContain("clinical records");
    });

    it("rejects unauthenticated message sending", async () => {
      const res = await request(app)
        .post("/api/ai/sessions/fakeId/messages")
        .send({ content: "Hello" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Doctor AI medical record context", () => {
    const createDoctorClinicalRecord = async (
      workerId: string,
      doctorId: string,
      consentId: string,
      overrides: Partial<{
        recordType: string;
        category: string;
        title: string;
        summary: string;
        diagnosis: string[];
        prescriptions: string[];
        followUpPlan: string;
      }> = {}
    ) => {
      return ClinicalRecord.create({
        workerId: new mongoose.Types.ObjectId(workerId),
        doctorId: new mongoose.Types.ObjectId(doctorId),
        consentId: new mongoose.Types.ObjectId(consentId),
        recordType: overrides.recordType || "CONSULTATION",
        category: overrides.category || "General Medicine",
        title: overrides.title || "General Checkup",
        summary: overrides.summary || "Routine checkup",
        details: {},
        diagnosis: overrides.diagnosis || [],
        prescriptions: overrides.prescriptions || [],
        followUpPlan: overrides.followUpPlan || null,
      });
    };

    it("allows authorized doctor to access selected worker's context", async () => {
      const { doctor, token: doctorToken } = await createVerifiedDoctor(
        "9100000060",
        "9100000098"
      );
      const { worker } = await createWorker("9100000061");

      const consent = await createApprovedConsent(doctor.id, worker.id);

      await createDoctorClinicalRecord(worker.id, doctor.id, consent._id.toString(), {
        recordType: "DIAGNOSIS",
        category: "Diabetes",
        title: "Type 2 Diabetes Diagnosis",
        summary: "Blood sugar levels elevated at 180 mg/dL",
        diagnosis: ["Type 2 Diabetes Mellitus"],
        prescriptions: ["Metformin 500mg twice daily"],
        followUpPlan: "Follow up in 3 months with HbA1c test",
      });

      const session = await createSession(doctorToken);

      (global.fetch as any).mockResolvedValueOnce(
        mockGroqResponse(
          "Based on the patient records, the diagnosis is Type 2 Diabetes Mellitus with Metformin prescribed. Consider HbA1c monitoring."
        )
      );

      const res = await request(app)
        .post(`/api/ai/sessions/${session.id}/messages`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          content: "Summarize this patient's recent records.",
          workerId: worker.id,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.session.messages[1].content).toContain("Type 2 Diabetes");

      const fetchCall = (global.fetch as any).mock.calls[0];
      const payload = JSON.parse(fetchCall[1].body);
      const systemMsg = payload.messages[0].content;
      expect(systemMsg).toContain("Type 2 Diabetes");
      expect(systemMsg).toContain("Metformin");
      expect(systemMsg).toContain("Patient's recent clinical records");
      expect(systemMsg).toContain("AI-assisted clinical decision support");
    });

    it("rejects unverified doctor from accessing worker records", async () => {
      const { token: doctorToken } = await createDoctor("9100000070");
      const { worker } = await createWorker("9100000071");

      const session = await createSession(doctorToken);

      (global.fetch as any).mockResolvedValueOnce(
        mockGroqResponse("I can help with general questions.")
      );

      const res = await request(app)
        .post(`/api/ai/sessions/${session.id}/messages`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          content: "Summarize this patient's records.",
          workerId: worker.id,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("verified");
    });

    it("rejects doctor without valid consent from accessing worker records", async () => {
      const { doctor, token: doctorToken } = await createVerifiedDoctor(
        "9100000072",
        "9100000097"
      );
      const { worker } = await createWorker("9100000073");

      const session = await createSession(doctorToken);

      (global.fetch as any).mockResolvedValueOnce(
        mockGroqResponse("I can help with general questions.")
      );

      const res = await request(app)
        .post(`/api/ai/sessions/${session.id}/messages`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          content: "Summarize this patient's records.",
          workerId: worker.id,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("consent");
    });

    it("rejects doctor from accessing another worker by changing workerId", async () => {
      const { doctor, token: doctorToken } = await createVerifiedDoctor(
        "9100000074",
        "9100000096"
      );
      const { worker: authorizedWorker } = await createWorker("9100000075");
      const { worker: unauthorizedWorker } = await createWorker("9100000076");

      const consent = await createApprovedConsent(
        doctor.id,
        authorizedWorker.id
      );

      await createDoctorClinicalRecord(
        authorizedWorker.id,
        doctor.id,
        consent._id.toString(),
        {
          title: "Authorized Worker Record",
          summary: "Authorized health data",
        }
      );

      await createDoctorClinicalRecord(
        unauthorizedWorker.id,
        new mongoose.Types.ObjectId().toString(),
        new mongoose.Types.ObjectId().toString(),
        {
          title: "Unauthorized Worker Record",
          summary: "Unauthorized health data",
        }
      );

      const session = await createSession(doctorToken);

      (global.fetch as any).mockResolvedValueOnce(
        mockGroqResponse("I can help with general questions.")
      );

      const res = await request(app)
        .post(`/api/ai/sessions/${session.id}/messages`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({
          content: "Summarize this patient's records.",
          workerId: unauthorizedWorker.id,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("consent");

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("doctor without workerId gets no patient context", async () => {
      const { doctor, token: doctorToken } = await createVerifiedDoctor(
        "9100000077",
        "9100000095"
      );
      const { worker } = await createWorker("9100000078");

      const consent = await createApprovedConsent(doctor.id, worker.id);

      await createDoctorClinicalRecord(
        worker.id,
        doctor.id,
        consent._id.toString(),
        {
          title: "Worker Record",
          summary: "Worker health data",
        }
      );

      const session = await createSession(doctorToken);

      (global.fetch as any).mockResolvedValueOnce(
        mockGroqResponse("I can help with general questions.")
      );

      const res = await request(app)
        .post(`/api/ai/sessions/${session.id}/messages`)
        .set("Authorization", `Bearer ${doctorToken}`)
        .send({ content: "What is hypertension?" });

      expect(res.status).toBe(200);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const payload = JSON.parse(fetchCall[1].body);
      const systemMsg = payload.messages[0].content;
      expect(systemMsg).not.toContain("Patient's recent clinical records");
    });

    it("rejects unauthenticated doctor AI request", async () => {
      const res = await request(app)
        .post("/api/ai/sessions/fakeId/messages")
        .send({ content: "Hello", workerId: "someWorkerId" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
