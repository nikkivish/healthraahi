import request from "supertest";
import app from "../src/app";
import { connectDatabase, disconnectDatabase } from "../src/config/database";
import { MedicalCamp } from "../src/models/MedicalCamp";
import { CampRegistration } from "../src/models/CampRegistration";
import { User } from "../src/models/User";
import { signToken } from "../src/utils/jwt";
import { stopMongoMemoryServer } from "./setup";

describe("Medical camp registration flow", () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await MedicalCamp.deleteMany({});
    await CampRegistration.deleteMany({});
  });

  afterAll(async () => {
    await disconnectDatabase();
    await stopMongoMemoryServer();
  });

  const registerUser = async (payload: {
    name: string;
    phone: string;
    email?: string;
    password: string;
    role: "WORKER" | "DOCTOR" | "ADMIN";
  }) => {
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

  const createTestCamp = async (adminToken: string) => {
    const response = await request(app)
      .post("/api/camps/admin/create")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Free Health Checkup",
        date: "2026-12-01",
        timeSlots: [
          { startTime: "09:00", endTime: "12:00", capacity: 50 },
          { startTime: "14:00", endTime: "17:00", capacity: 30 },
        ],
        location: "Community Hall, Sector 12",
        city: "Gurugram",
        specialties: ["General", "Cardiology"],
        feeType: "FREE",
        description: "Free health screening for all workers.",
        organizer: "HealthRaahi + Civil Hospital",
      });
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    return response.body.data.camp;
  };

  it("allows public user to list active camps", async () => {
    const admin = await registerUser({
      name: "Admin User",
      phone: "+15550000101",
      password: "StrongPass!123",
      role: "ADMIN",
    });
    const adminToken = signToken({ userId: admin.id, role: admin.role });

    await createTestCamp(adminToken);

    const response = await request(app).get("/api/camps");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.camps.length).toBe(1);
    expect(response.body.data.camps[0].name).toBe("Free Health Checkup");
  });

  it("allows worker to register for a camp", async () => {
    const admin = await registerUser({
      name: "Admin User",
      phone: "+15550000102",
      password: "StrongPass!123",
      role: "ADMIN",
    });
    const adminToken = signToken({ userId: admin.id, role: admin.role });

    const worker = await registerUser({
      name: "Worker User",
      phone: "+15550000103",
      password: "StrongPass!123",
      role: "WORKER",
    });
    const workerToken = signToken({ userId: worker.id, role: worker.role });

    const camp = await createTestCamp(adminToken);

    const response = await request(app)
      .post(`/api/camps/${camp.id}/register`)
      .set("Authorization", `Bearer ${workerToken}`)
      .send({ timeSlotIndex: 0, healthConcerns: "Mild headache" });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.registration.status).toBe("CONFIRMED");
    expect(response.body.data.registration.timeSlotIndex).toBe(0);
  });

  it("prevents duplicate registration for the same camp", async () => {
    const admin = await registerUser({
      name: "Admin User",
      phone: "+15550000104",
      password: "StrongPass!123",
      role: "ADMIN",
    });
    const adminToken = signToken({ userId: admin.id, role: admin.role });

    const worker = await registerUser({
      name: "Worker User",
      phone: "+15550000105",
      password: "StrongPass!123",
      role: "WORKER",
    });
    const workerToken = signToken({ userId: worker.id, role: worker.role });

    const camp = await createTestCamp(adminToken);

    const first = await request(app)
      .post(`/api/camps/${camp.id}/register`)
      .set("Authorization", `Bearer ${workerToken}`)
      .send({ timeSlotIndex: 0 });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post(`/api/camps/${camp.id}/register`)
      .set("Authorization", `Bearer ${workerToken}`)
      .send({ timeSlotIndex: 1 });
    expect(second.status).toBe(400);
    expect(second.body.message).toMatch(/already registered/i);
  });

  it("prevents registration when time slot is full", async () => {
    const admin = await registerUser({
      name: "Admin User",
      phone: "+15550000106",
      password: "StrongPass!123",
      role: "ADMIN",
    });
    const adminToken = signToken({ userId: admin.id, role: admin.role });

    const camp = await createTestCamp(adminToken);

    const slot = camp.timeSlots[1];
    expect(slot.capacity).toBe(30);

    for (let i = 0; i < 30; i++) {
      const w = await registerUser({
        name: `Worker ${i}`,
        phone: `+15550002${String(i).padStart(3, "0")}`,
        password: "StrongPass!123",
        role: "WORKER",
      });
      const wToken = signToken({ userId: w.id, role: w.role });

      const res = await request(app)
        .post(`/api/camps/${camp.id}/register`)
        .set("Authorization", `Bearer ${wToken}`)
        .send({ timeSlotIndex: 1 });
      expect(res.status).toBe(201);
    }

    const overflowWorker = await registerUser({
      name: "Overflow Worker",
      phone: "+15550002030",
      password: "StrongPass!123",
      role: "WORKER",
    });
    const overflowToken = signToken({
      userId: overflowWorker.id,
      role: overflowWorker.role,
    });

    const overflow = await request(app)
      .post(`/api/camps/${camp.id}/register`)
      .set("Authorization", `Bearer ${overflowToken}`)
      .send({ timeSlotIndex: 1 });
    expect(overflow.status).toBe(400);
    expect(overflow.body.message).toMatch(/full/i);
  });

  it("prevents registration for cancelled camp", async () => {
    const admin = await registerUser({
      name: "Admin User",
      phone: "+15550000107",
      password: "StrongPass!123",
      role: "ADMIN",
    });
    const adminToken = signToken({ userId: admin.id, role: admin.role });

    const worker = await registerUser({
      name: "Worker User",
      phone: "+15550000108",
      password: "StrongPass!123",
      role: "WORKER",
    });
    const workerToken = signToken({ userId: worker.id, role: worker.role });

    const camp = await createTestCamp(adminToken);

    await request(app)
      .patch(`/api/camps/admin/${camp.id}/cancel`)
      .set("Authorization", `Bearer ${adminToken}`);

    const response = await request(app)
      .post(`/api/camps/${camp.id}/register`)
      .set("Authorization", `Bearer ${workerToken}`)
      .send({ timeSlotIndex: 0 });
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/cancelled/i);
  });

  it("allows worker to cancel registration", async () => {
    const admin = await registerUser({
      name: "Admin User",
      phone: "+15550000109",
      password: "StrongPass!123",
      role: "ADMIN",
    });
    const adminToken = signToken({ userId: admin.id, role: admin.role });

    const worker = await registerUser({
      name: "Worker User",
      phone: "+15550000110",
      password: "StrongPass!123",
      role: "WORKER",
    });
    const workerToken = signToken({ userId: worker.id, role: worker.role });

    const camp = await createTestCamp(adminToken);

    const reg = await request(app)
      .post(`/api/camps/${camp.id}/register`)
      .set("Authorization", `Bearer ${workerToken}`)
      .send({ timeSlotIndex: 0 });
    expect(reg.status).toBe(201);
    const regId = reg.body.data.registration.id;

    const cancel = await request(app)
      .patch(`/api/camps/my-registrations/${regId}/cancel`)
      .set("Authorization", `Bearer ${workerToken}`);
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.registration.status).toBe("CANCELLED");
  });

  it("prevents non-workers from registering for camps", async () => {
    const admin = await registerUser({
      name: "Admin User",
      phone: "+15550000111",
      password: "StrongPass!123",
      role: "ADMIN",
    });
    const adminToken = signToken({ userId: admin.id, role: admin.role });

    const doctor = await registerUser({
      name: "Dr. User",
      phone: "+15550000112",
      password: "StrongPass!123",
      role: "DOCTOR",
    });
    const doctorToken = signToken({ userId: doctor.id, role: doctor.role });

    const camp = await createTestCamp(adminToken);

    const response = await request(app)
      .post(`/api/camps/${camp.id}/register`)
      .set("Authorization", `Bearer ${doctorToken}`)
      .send({ timeSlotIndex: 0 });
    expect(response.status).toBe(403);
  });

  it("allows admin to create, edit, and cancel camps", async () => {
    const admin = await registerUser({
      name: "Admin User",
      phone: "+15550000113",
      password: "StrongPass!123",
      role: "ADMIN",
    });
    const adminToken = signToken({ userId: admin.id, role: admin.role });

    const camp = await createTestCamp(adminToken);
    expect(camp.name).toBe("Free Health Checkup");

    const edit = await request(app)
      .patch(`/api/camps/admin/${camp.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Updated Health Camp" });
    expect(edit.status).toBe(200);
    expect(edit.body.data.camp.name).toBe("Updated Health Camp");

    const cancel = await request(app)
      .patch(`/api/camps/admin/${camp.id}/cancel`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.camp.status).toBe("CANCELLED");
  });

  it("allows worker to view their registrations", async () => {
    const admin = await registerUser({
      name: "Admin User",
      phone: "+15550000114",
      password: "StrongPass!123",
      role: "ADMIN",
    });
    const adminToken = signToken({ userId: admin.id, role: admin.role });

    const worker = await registerUser({
      name: "Worker User",
      phone: "+15550000115",
      password: "StrongPass!123",
      role: "WORKER",
    });
    const workerToken = signToken({ userId: worker.id, role: worker.role });

    const camp = await createTestCamp(adminToken);

    await request(app)
      .post(`/api/camps/${camp.id}/register`)
      .set("Authorization", `Bearer ${workerToken}`)
      .send({ timeSlotIndex: 0 });

    const response = await request(app)
      .get("/api/camps/my-registrations")
      .set("Authorization", `Bearer ${workerToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.registrations.length).toBe(1);
    expect(response.body.data.registrations[0].camp.name).toBe(
      "Free Health Checkup"
    );
  });
});
