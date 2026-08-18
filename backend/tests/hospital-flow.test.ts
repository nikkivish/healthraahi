import mongoose from "mongoose";
import request from "supertest";
import app from "../src/app";
import { connectDatabase, disconnectDatabase } from "../src/config/database";
import { DoctorProfile } from "../src/models/DoctorProfile";
import { DoctorVerificationDocument } from "../src/models/DoctorVerificationDocument";
import { User } from "../src/models/User";
import { signToken } from "../src/utils/jwt";
import { stopMongoMemoryServer } from "./setup";

describe("Hospital management and doctor-hospital linking", () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await DoctorProfile.deleteMany({});
    await DoctorVerificationDocument.deleteMany({});
  });

  afterAll(async () => {
    await disconnectDatabase();
    await stopMongoMemoryServer();
  });

  const registerUser = async (
    payload: { name: string; phone: string; email?: string; password: string; role: "WORKER" | "DOCTOR" | "ADMIN" }
  ) => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    return response.body.data.user;
  };

  const loginUser = async (payload: { phone: string; password: string }) => {
    const response = await request(app)
      .post("/api/auth/login")
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    return response.body.data;
  };

  it("allows admin to create a hospital and fetch hospital details", async () => {
    const admin = await registerUser({
      name: "System Admin",
      phone: "+15550000001",
      email: "admin@example.com",
      password: "StrongPass!123",
      role: "ADMIN",
    });

    const adminToken = signToken({ userId: admin.id, role: admin.role });

    const createHospitalResponse = await request(app)
      .post("/api/hospitals")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        hospitalId: "HOSP-1001",
        name: "Green Valley Hospital",
        registrationNumber: "REG-1001",
        address: "12 Health Avenue",
        city: "Phoenix",
        state: "AZ",
        phone: "+15550001111",
        email: "hello@greenvalley.example",
      });

    expect(createHospitalResponse.status).toBe(201);
    expect(createHospitalResponse.body.success).toBe(true);
    expect(createHospitalResponse.body.data.hospital.name).toBe("Green Valley Hospital");

    const listResponse = await request(app)
      .get("/api/hospitals")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data.hospitals.length).toBeGreaterThanOrEqual(1);

    const hospitalId = createHospitalResponse.body.data.hospital.id;
    const detailResponse = await request(app)
      .get(`/api/hospitals/${hospitalId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.hospital.name).toBe("Green Valley Hospital");
  });

  it("prevents non-admin hospital creation and links only verified doctors to a hospital", async () => {
    const admin = await registerUser({
      name: "System Admin",
      phone: "+15550000002",
      email: "admin2@example.com",
      password: "StrongPass!123",
      role: "ADMIN",
    });
    const worker = await registerUser({
      name: "Worker User",
      phone: "+15550000003",
      email: "worker@example.com",
      password: "StrongPass!123",
      role: "WORKER",
    });
    const doctor = await registerUser({
      name: "Dr. Smith",
      phone: "+15550000004",
      email: "doctor@example.com",
      password: "StrongPass!123",
      role: "DOCTOR",
    });

    const adminToken = signToken({ userId: admin.id, role: admin.role });
    const workerToken = signToken({ userId: worker.id, role: worker.role });
    const doctorToken = signToken({ userId: doctor.id, role: doctor.role });

    const forbiddenCreation = await request(app)
      .post("/api/hospitals")
      .set("Authorization", `Bearer ${workerToken}`)
      .send({
        hospitalId: "HOSP-2001",
        name: "Rejected Hospital",
        registrationNumber: "REG-2001",
        address: "99 No Access Road",
        city: "Denver",
        state: "CO",
        phone: "+15550002222",
      });

    expect(forbiddenCreation.status).toBe(403);
    expect(forbiddenCreation.body.success).toBe(false);

    const hospitalResponse = await request(app)
      .post("/api/hospitals")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        hospitalId: "HOSP-2002",
        name: "City Health Center",
        registrationNumber: "REG-2002",
        address: "24 Wellness Lane",
        city: "Denver",
        state: "CO",
        phone: "+15550002223",
      });

    expect(hospitalResponse.status).toBe(201);
    const hospitalId = hospitalResponse.body.data.hospital.id;

    const doctorProfileResponse = await request(app)
      .patch("/api/doctors/profile/me")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({
        fullName: "Dr. Smith",
        specialization: "Cardiology",
        medicalRegistrationNumber: "MED-2024-001",
        phone: "+15550004444",
      });

    expect(doctorProfileResponse.status).toBe(200);

    const unverifiedLink = await request(app)
      .patch("/api/doctors/profile/me/hospital")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({ hospitalId });

    expect(unverifiedLink.status).toBe(403);
    expect(unverifiedLink.body.message).toMatch(/not verified/i);

    const doctorProfile = await DoctorProfile.findOne({ userId: doctor.id });
    expect(doctorProfile).not.toBeNull();

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

    const verifyResponse = await request(app)
      .patch(`/api/doctors/${doctorProfile!.doctorId}/verify`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "VERIFIED", reason: "Credentials validated" });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.data.profile.verificationStatus).toBe("VERIFIED");

    const verifiedLink = await request(app)
      .patch("/api/doctors/profile/me/hospital")
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({ hospitalId });

    expect(verifiedLink.status).toBe(200);
    expect(verifiedLink.body.data.profile.hospitalId).toBe(hospitalId);

    const myProfile = await request(app)
      .get("/api/doctors/profile/me")
      .set("Authorization", `Bearer ${doctorToken}`);

    expect(myProfile.status).toBe(200);
    expect(myProfile.body.data.profile.hospitalId).toBe(hospitalId);

    const unlinkResponse = await request(app)
      .delete("/api/doctors/profile/me/hospital")
      .set("Authorization", `Bearer ${doctorToken}`);

    expect(unlinkResponse.status).toBe(200);
    expect(unlinkResponse.body.data.profile.hospitalId).toBeUndefined();
  });
});
