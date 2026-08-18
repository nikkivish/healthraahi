import mongoose from "mongoose";
import request from "supertest";
import app from "../src/app";
import { connectDatabase, disconnectDatabase } from "../src/config/database";
import { AuditLog } from "../src/models/AuditLog";
import { ClinicalRecord } from "../src/models/ClinicalRecord";
import { ClinicalRecordDocument } from "../src/models/ClinicalRecordDocument";
import { Consent } from "../src/models/Consent";
import { DoctorProfile } from "../src/models/DoctorProfile";
import { DoctorVerificationDocument } from "../src/models/DoctorVerificationDocument";
import { User } from "../src/models/User";
import { signToken } from "../src/utils/jwt";
import { stopMongoMemoryServer } from "./setup";

describe("Clinical record documents", () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await DoctorProfile.deleteMany({});
    await DoctorVerificationDocument.deleteMany({});
    await Consent.deleteMany({});
    await ClinicalRecord.deleteMany({});
    await ClinicalRecordDocument.deleteMany({});
    await AuditLog.deleteMany({});
  });

  afterAll(async () => {
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

  const createVerifiedDoctor = async (phone = "9100000001", adminPhone = "9100000099") => {
    const doctor = await registerUser({
      name: "Dr. Test",
      phone,
      password: "Doctor@1234",
      role: "DOCTOR",
    });

    const doctorToken = signToken({ userId: doctor.id, role: doctor.role });

    await request(app)
      .patch("/api/doctors/profile/me")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        fullName: "Dr. Test",
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

  const createTestWorker = async (phone = "9100000002") => {
    const worker = await registerUser({
      name: "Test Worker",
      phone,
      password: "Worker@1234",
      role: "WORKER",
    });
    const { token } = await loginUser({ phone, password: "Worker@1234" });
    return { worker, token };
  };

  const createApprovedConsent = async (
    doctorId: string,
    workerId: string
  ) => {
    const consent = await Consent.create({
      workerId: new mongoose.Types.ObjectId(workerId),
      doctorId: new mongoose.Types.ObjectId(doctorId),
      categories: ["MEDICAL_RECORDS"],
      purpose: "Treatment",
      status: "APPROVED",
      validFrom: new Date(Date.now() - 86400000),
      validUntil: new Date(Date.now() + 86400000 * 30),
    });
    return consent;
  };

  const createClinicalRecord = async (
    doctorToken: string,
    workerId: string,
    consentId: string
  ) => {
    const res = await request(app)
      .post("/api/clinical-records")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        workerId,
        consentId,
        recordType: "CONSULTATION",
        category: "General Medicine",
        title: "Checkup",
        summary: "Routine checkup",
      });
    expect(res.status).toBe(201);
    return res.body.data.record;
  };

  const createPdfBuffer = () =>
    Buffer.from("%PDF-1.4 test content", "utf-8");

  const createPngBuffer = () =>
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const createJpegBuffer = () =>
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

  const uploadDocuments = async (
    doctorToken: string,
    recordId: string,
    files: { buffer: Buffer; filename: string; contentType: string }[]
  ) => {
    const req = request(app)
      .post(`/api/clinical-record-documents/${recordId}`)
      .set("Authorization", `Bearer ${doctorToken}`);

    for (const f of files) {
      req.attach("files", f.buffer, { filename: f.filename, contentType: f.contentType });
    }

    return req;
  };

  it("allows verified doctor with active consent to upload a document", async () => {
    const { token: doctorToken } = await createVerifiedDoctor();
    const { worker } = await createTestWorker();
    const consent = await createApprovedConsent(
      (await DoctorProfile.findOne({}))!.userId.toString(),
      worker.id
    );
    const record = await createClinicalRecord(doctorToken, worker.id, consent._id.toString());

    const res = await uploadDocuments(doctorToken, record.id, [
      { buffer: createPdfBuffer(), filename: "report.pdf", contentType: "application/pdf" },
    ]);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.uploaded.length).toBe(1);
    expect(res.body.data.failed.length).toBe(0);
    expect(res.body.data.uploaded[0].originalFileName).toBe("report.pdf");
    expect(res.body.data.uploaded[0].mimeType).toBe("application/pdf");
  });

  it("uploads multiple files to the same record", async () => {
    const { token: doctorToken } = await createVerifiedDoctor();
    const { worker } = await createTestWorker();
    const consent = await createApprovedConsent(
      (await DoctorProfile.findOne({}))!.userId.toString(),
      worker.id
    );
    const record = await createClinicalRecord(doctorToken, worker.id, consent._id.toString());

    const res = await uploadDocuments(doctorToken, record.id, [
      { buffer: createPdfBuffer(), filename: "blood.pdf", contentType: "application/pdf" },
      { buffer: createPngBuffer(), filename: "xray.png", contentType: "image/png" },
      { buffer: createJpegBuffer(), filename: "scan.jpg", contentType: "image/jpeg" },
    ]);

    expect(res.status).toBe(201);
    expect(res.body.data.uploaded.length).toBe(3);
    expect(res.body.data.failed.length).toBe(0);
  });

  it("lists documents for a clinical record", async () => {
    const { token: doctorToken } = await createVerifiedDoctor();
    const { worker, token: workerToken } = await createTestWorker();
    const consent = await createApprovedConsent(
      (await DoctorProfile.findOne({}))!.userId.toString(),
      worker.id
    );
    const record = await createClinicalRecord(doctorToken, worker.id, consent._id.toString());

    await uploadDocuments(doctorToken, record.id, [
      { buffer: createPdfBuffer(), filename: "a.pdf", contentType: "application/pdf" },
      { buffer: createPdfBuffer(), filename: "b.pdf", contentType: "application/pdf" },
    ]);

    const res = await request(app)
      .get(`/api/clinical-record-documents/record/${record.id}`)
      .set("Authorization", `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.documents.length).toBe(2);
  });

  it("worker can list documents for their own record", async () => {
    const { token: doctorToken } = await createVerifiedDoctor();
    const { worker, token: workerToken } = await createTestWorker();
    const consent = await createApprovedConsent(
      (await DoctorProfile.findOne({}))!.userId.toString(),
      worker.id
    );
    const record = await createClinicalRecord(doctorToken, worker.id, consent._id.toString());

    await uploadDocuments(doctorToken, record.id, [
      { buffer: createPdfBuffer(), filename: "report.pdf", contentType: "application/pdf" },
    ]);

    const res = await request(app)
      .get(`/api/clinical-record-documents/record/${record.id}`)
      .set("Authorization", `Bearer ${workerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.documents.length).toBe(1);
  });

  it("doctor can download a document", async () => {
    const { token: doctorToken } = await createVerifiedDoctor();
    const { worker } = await createTestWorker();
    const consent = await createApprovedConsent(
      (await DoctorProfile.findOne({}))!.userId.toString(),
      worker.id
    );
    const record = await createClinicalRecord(doctorToken, worker.id, consent._id.toString());

    const uploadRes = await uploadDocuments(doctorToken, record.id, [
      { buffer: createPdfBuffer(), filename: "report.pdf", contentType: "application/pdf" },
    ]);
    const docId = uploadRes.body.data.uploaded[0].id;

    const res = await request(app)
      .get(`/api/clinical-record-documents/${docId}/download`)
      .set("Authorization", `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["content-disposition"]).toContain("attachment");
  });

  it("worker can download a document from their own record", async () => {
    const { token: doctorToken } = await createVerifiedDoctor();
    const { worker, token: workerToken } = await createTestWorker();
    const consent = await createApprovedConsent(
      (await DoctorProfile.findOne({}))!.userId.toString(),
      worker.id
    );
    const record = await createClinicalRecord(doctorToken, worker.id, consent._id.toString());

    const uploadRes = await uploadDocuments(doctorToken, record.id, [
      { buffer: createPdfBuffer(), filename: "report.pdf", contentType: "application/pdf" },
    ]);
    const docId = uploadRes.body.data.uploaded[0].id;

    const res = await request(app)
      .get(`/api/clinical-record-documents/${docId}/download`)
      .set("Authorization", `Bearer ${workerToken}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
  });

  it("rejects unsupported file type", async () => {
    const { token: doctorToken } = await createVerifiedDoctor();
    const { worker } = await createTestWorker();
    const consent = await createApprovedConsent(
      (await DoctorProfile.findOne({}))!.userId.toString(),
      worker.id
    );
    const record = await createClinicalRecord(doctorToken, worker.id, consent._id.toString());

    const res = await uploadDocuments(doctorToken, record.id, [
      { buffer: Buffer.from("not a pdf"), filename: "bad.txt", contentType: "text/plain" },
    ]);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects files larger than 10MB", async () => {
    const { token: doctorToken } = await createVerifiedDoctor();
    const { worker } = await createTestWorker();
    const consent = await createApprovedConsent(
      (await DoctorProfile.findOne({}))!.userId.toString(),
      worker.id
    );
    const record = await createClinicalRecord(doctorToken, worker.id, consent._id.toString());

    const bigBuffer = Buffer.alloc(11 * 1024 * 1024, 0x41);

    const res = await request(app)
      .post(`/api/clinical-record-documents/${record.id}`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .attach("files", bigBuffer, { filename: "huge.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

 it("denies unverified doctor from uploading", async () => {
  const { token: verifiedDoctorToken, doctor: verifiedDoctor } =
    await createVerifiedDoctor("9100000012");

  const unverifiedDoctor = await registerUser({
    name: "Unverified Doc",
    phone: "9100000010",
    password: "Doctor@1234",
    role: "DOCTOR",
  });

  const unverifiedToken = signToken({
    userId: unverifiedDoctor.id,
    role: unverifiedDoctor.role,
  });

  const { worker } = await createTestWorker("9100000011");

  const consent = await Consent.create({
    workerId: new mongoose.Types.ObjectId(worker.id),
    doctorId: new mongoose.Types.ObjectId(verifiedDoctor.id),
    categories: ["MEDICAL_RECORDS"],
    purpose: "Treatment",
    status: "APPROVED",
    validFrom: new Date(Date.now() - 86400000),
    validUntil: new Date(Date.now() + 86400000 * 30),
  });

  // Create the prerequisite record using the verified doctor.
  const record = await createClinicalRecord(
    verifiedDoctorToken,
    worker.id,
    consent._id.toString()
  );

  // Unverified doctor must not be allowed to upload.
  const res = await uploadDocuments(unverifiedToken, record.id, [
    {
      buffer: createPdfBuffer(),
      filename: "report.pdf",
      contentType: "application/pdf",
    },
  ]);

  expect(res.status).toBe(403);
});
it("denies doctor without consent from uploading", async () => {
  const { token: doctorToken, doctor } =
    await createVerifiedDoctor("9100000020");

  const { worker } = await createTestWorker("9100000021");

  const consent = await Consent.create({
    workerId: new mongoose.Types.ObjectId(worker.id),
    doctorId: new mongoose.Types.ObjectId(doctor.id),
    categories: ["MEDICAL_RECORDS"],
    purpose: "Treatment",
    status: "APPROVED",
    validFrom: new Date(Date.now() - 86400000),
    validUntil: new Date(Date.now() + 86400000 * 30),
  });

  // First create a valid record while the consent is active.
  const record = await createClinicalRecord(
    doctorToken,
    worker.id,
    consent._id.toString()
  );

  // Remove the consent before attempting document upload.
  await Consent.deleteMany({});

  const res = await uploadDocuments(doctorToken, record.id, [
    {
      buffer: createPdfBuffer(),
      filename: "report.pdf",
      contentType: "application/pdf",
    },
  ]);

  expect(res.status).toBe(403);
});
  
  it("denies doctor with revoked consent from viewing documents", async () => {
    const { token: doctorToken } = await createVerifiedDoctor("9100000030");
    const { worker } = await createTestWorker("9100000031");
    const doctorProfile = await DoctorProfile.findOne({});
    const consent = await createApprovedConsent(
      doctorProfile!.userId.toString(),
      worker.id
    );
    const record = await createClinicalRecord(doctorToken, worker.id, consent._id.toString());

    const uploadRes = await uploadDocuments(doctorToken, record.id, [
      { buffer: createPdfBuffer(), filename: "report.pdf", contentType: "application/pdf" },
    ]);
    const docId = uploadRes.body.data.uploaded[0].id;

    await Consent.updateMany(
      { _id: consent._id },
      { $set: { status: "REVOKED" } }
    );

    const res = await request(app)
      .get(`/api/clinical-record-documents/${docId}/download`)
      .set("Authorization", `Bearer ${doctorToken}`);

    expect(res.status).toBe(403);
  });

  it("worker retains document access after doctor consent is revoked", async () => {
    const { token: doctorToken } = await createVerifiedDoctor("9100000040");
    const { worker, token: workerToken } = await createTestWorker("9100000041");
    const doctorProfile = await DoctorProfile.findOne({});
    const consent = await createApprovedConsent(
      doctorProfile!.userId.toString(),
      worker.id
    );
    const record = await createClinicalRecord(doctorToken, worker.id, consent._id.toString());

    const uploadRes = await uploadDocuments(doctorToken, record.id, [
      { buffer: createPdfBuffer(), filename: "report.pdf", contentType: "application/pdf" },
    ]);
    const docId = uploadRes.body.data.uploaded[0].id;

    await Consent.updateMany(
      { _id: consent._id },
      { $set: { status: "REVOKED" } }
    );

    const res = await request(app)
      .get(`/api/clinical-record-documents/${docId}/download`)
      .set("Authorization", `Bearer ${workerToken}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
  });

  it("another worker cannot access documents", async () => {
    const { token: doctorToken } = await createVerifiedDoctor("9100000050");
    const { worker } = await createTestWorker("9100000051");
    const otherWorker = await createTestWorker("9100000052");
    const doctorProfile = await DoctorProfile.findOne({});
    const consent = await createApprovedConsent(
      doctorProfile!.userId.toString(),
      worker.id
    );
    const record = await createClinicalRecord(doctorToken, worker.id, consent._id.toString());

    const uploadRes = await uploadDocuments(doctorToken, record.id, [
      { buffer: createPdfBuffer(), filename: "report.pdf", contentType: "application/pdf" },
    ]);
    const docId = uploadRes.body.data.uploaded[0].id;

    const res = await request(app)
      .get(`/api/clinical-record-documents/${docId}/download`)
      .set("Authorization", `Bearer ${otherWorker.token}`);

    expect(res.status).toBe(403);
  });

  it("another doctor cannot access documents", async () => {
    const { token: doctorToken } = await createVerifiedDoctor("9100000060", "9100000090");
    const otherDoctor = await createVerifiedDoctor("9100000061", "9100000091");
    const { worker } = await createTestWorker("9100000062");
    const doctorProfile = await DoctorProfile.findOne({ userId: (await User.findOne({ phone: "9100000060" }))!.id });
    const consent = await createApprovedConsent(
      doctorProfile!.userId.toString(),
      worker.id
    );
    const record = await createClinicalRecord(doctorToken, worker.id, consent._id.toString());

    const uploadRes = await uploadDocuments(doctorToken, record.id, [
      { buffer: createPdfBuffer(), filename: "report.pdf", contentType: "application/pdf" },
    ]);
    const docId = uploadRes.body.data.uploaded[0].id;

    const res = await request(app)
      .get(`/api/clinical-record-documents/${docId}/download`)
      .set("Authorization", `Bearer ${otherDoctor.token}`);

    expect(res.status).toBe(403);
  });

  it("doctor who uploaded can delete a document", async () => {
    const { token: doctorToken } = await createVerifiedDoctor("9100000070");
    const { worker } = await createTestWorker("9100000071");
    const doctorProfile = await DoctorProfile.findOne({});
    const consent = await createApprovedConsent(
      doctorProfile!.userId.toString(),
      worker.id
    );
    const record = await createClinicalRecord(doctorToken, worker.id, consent._id.toString());

    const uploadRes = await uploadDocuments(doctorToken, record.id, [
      { buffer: createPdfBuffer(), filename: "report.pdf", contentType: "application/pdf" },
    ]);
    const docId = uploadRes.body.data.uploaded[0].id;

    const delRes = await request(app)
      .delete(`/api/clinical-record-documents/${docId}`)
      .set("Authorization", `Bearer ${doctorToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const listRes = await request(app)
      .get(`/api/clinical-record-documents/record/${record.id}`)
      .set("Authorization", `Bearer ${doctorToken}`);

    expect(listRes.body.data.documents.length).toBe(0);
  });

  it("worker cannot delete doctor-created documents", async () => {
    const { token: doctorToken } = await createVerifiedDoctor("9100000080");
    const { worker, token: workerToken } = await createTestWorker("9100000081");
    const doctorProfile = await DoctorProfile.findOne({});
    const consent = await createApprovedConsent(
      doctorProfile!.userId.toString(),
      worker.id
    );
    const record = await createClinicalRecord(doctorToken, worker.id, consent._id.toString());

    const uploadRes = await uploadDocuments(doctorToken, record.id, [
      { buffer: createPdfBuffer(), filename: "report.pdf", contentType: "application/pdf" },
    ]);
    const docId = uploadRes.body.data.uploaded[0].id;

    const res = await request(app)
      .delete(`/api/clinical-record-documents/${docId}`)
      .set("Authorization", `Bearer ${workerToken}`);

    expect(res.status).toBe(403);
  });

  it("logs audit events for upload, download, and delete", async () => {
    const { token: doctorToken } = await createVerifiedDoctor("9100000090");
    const { worker } = await createTestWorker("9100000091");
    const doctorProfile = await DoctorProfile.findOne({});
    const consent = await createApprovedConsent(
      doctorProfile!.userId.toString(),
      worker.id
    );
    const record = await createClinicalRecord(doctorToken, worker.id, consent._id.toString());

    const uploadRes = await uploadDocuments(doctorToken, record.id, [
      { buffer: createPdfBuffer(), filename: "report.pdf", contentType: "application/pdf" },
    ]);
    const docId = uploadRes.body.data.uploaded[0].id;

    const uploadAudit = await AuditLog.findOne({ action: "DOCUMENT_UPLOADED" });
    expect(uploadAudit).not.toBeNull();
    expect(uploadAudit!.result).toBe("SUCCESS");

    await request(app)
      .get(`/api/clinical-record-documents/${docId}/download`)
      .set("Authorization", `Bearer ${doctorToken}`);

    const downloadAudit = await AuditLog.findOne({ action: "DOCUMENT_DOWNLOADED" });
    expect(downloadAudit).not.toBeNull();

    await request(app)
      .delete(`/api/clinical-record-documents/${docId}`)
      .set("Authorization", `Bearer ${doctorToken}`);

    const deleteAudit = await AuditLog.findOne({ action: "DOCUMENT_DELETED" });
    expect(deleteAudit).not.toBeNull();
  });

  it("existing clinical record creation without attachments still works", async () => {
    const { token: doctorToken } = await createVerifiedDoctor("9100000100");
    const { worker } = await createTestWorker("9100000101");
    const doctorProfile = await DoctorProfile.findOne({});
    const consent = await createApprovedConsent(
      doctorProfile!.userId.toString(),
      worker.id
    );

    const res = await request(app)
      .post("/api/clinical-records")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        workerId: worker.id,
        consentId: consent._id.toString(),
        recordType: "CONSULTATION",
        category: "General Medicine",
        title: "Checkup",
        summary: "Routine checkup",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.record.title).toBe("Checkup");
  });

  it("returns empty documents list for record with no attachments", async () => {
    const { token: doctorToken } = await createVerifiedDoctor("9100000110");
    const { worker } = await createTestWorker("9100000111");
    const doctorProfile = await DoctorProfile.findOne({});
    const consent = await createApprovedConsent(
      doctorProfile!.userId.toString(),
      worker.id
    );
    const record = await createClinicalRecord(doctorToken, worker.id, consent._id.toString());

    const res = await request(app)
      .get(`/api/clinical-record-documents/record/${record.id}`)
      .set("Authorization", `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.documents.length).toBe(0);
  });
});
