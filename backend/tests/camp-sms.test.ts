import request from "supertest";
import app from "../src/app";
import { connectDatabase, disconnectDatabase } from "../src/config/database";
import { MedicalCamp } from "../src/models/MedicalCamp";
import { CampRegistration } from "../src/models/CampRegistration";
import { CampSmsLog } from "../src/models/CampSmsLog";
import { User } from "../src/models/User";
import { signToken } from "../src/utils/jwt";
import { sendCampCreationSms } from "../src/services/sms.service";
import { stopMongoMemoryServer } from "./setup";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Camp creation SMS notifications", () => {
  const originalEnv = {
    MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY,
    MSG91_FLOW_ID: process.env.MSG91_FLOW_ID,
    MSG91_SENDER_ID: process.env.MSG91_SENDER_ID,
  };

  beforeAll(async () => {
    await connectDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await MedicalCamp.deleteMany({});
    await CampRegistration.deleteMany({});
    await CampSmsLog.deleteMany({});
    mockFetch.mockReset();

    process.env.MSG91_AUTH_KEY = "test-auth-key";
    process.env.MSG91_FLOW_ID = "test-flow-id";
    process.env.MSG91_SENDER_ID = "HRAAHI";
  });

  afterAll(async () => {
    process.env.MSG91_AUTH_KEY = originalEnv.MSG91_AUTH_KEY || "";
    process.env.MSG91_FLOW_ID = originalEnv.MSG91_FLOW_ID || "";
    process.env.MSG91_SENDER_ID = originalEnv.MSG91_SENDER_ID || "";
    await disconnectDatabase();
    await stopMongoMemoryServer();
  });

  const registerUser = async (payload: {
    name: string;
    phone: string;
    password: string;
    role: "WORKER" | "DOCTOR" | "ADMIN";
  }) => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(payload);
    expect(response.status).toBe(201);
    return response.body.data.user;
  };

  const createTestCamp = async (adminToken: string) => {
    const response = await request(app)
      .post("/api/camps/admin/create")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Free Health Checkup",
        date: "2026-12-01",
        timeSlots: [{ startTime: "09:00", endTime: "12:00", capacity: 50 }],
        location: "Community Hall, Sector 12",
        city: "Gurugram",
        specialties: ["General"],
        feeType: "FREE",
        description: "Free health screening.",
        organizer: "HealthRaahi",
      });
    expect(response.status).toBe(201);
    return response.body.data.camp;
  };

  it("sends SMS to all active workers when camp is created", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ type: "success", request_id: "mock-req-001" }),
    });

    const admin = await registerUser({
      name: "Admin",
      phone: "+15550000301",
      password: "StrongPass!123",
      role: "ADMIN",
    });
    const adminToken = signToken({ userId: admin.id, role: admin.role });

    await registerUser({
      name: "Worker 1",
      phone: "+15550000302",
      password: "StrongPass!123",
      role: "WORKER",
    });
    await registerUser({
      name: "Worker 2",
      phone: "+15550000303",
      password: "StrongPass!123",
      role: "WORKER",
    });

    await createTestCamp(adminToken);
    await new Promise((r) => setTimeout(r, 500));

    const logs = await CampSmsLog.find({ status: "SENT" });
    expect(logs.length).toBe(2);
  });

  it("does not send SMS to DOCTOR users", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ type: "success", request_id: "mock-req-001" }),
    });

    const admin = await registerUser({
      name: "Admin",
      phone: "+15550000311",
      password: "StrongPass!123",
      role: "ADMIN",
    });
    const adminToken = signToken({ userId: admin.id, role: admin.role });

    await registerUser({
      name: "Doctor User",
      phone: "+15550000312",
      password: "StrongPass!123",
      role: "DOCTOR",
    });

    await createTestCamp(adminToken);
    await new Promise((r) => setTimeout(r, 500));

    const logs = await CampSmsLog.find();
    expect(logs.length).toBe(0);
  });

  it("does not send SMS to ADMIN users", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ type: "success", request_id: "mock-req-001" }),
    });

    const admin = await registerUser({
      name: "Admin",
      phone: "+15550000321",
      password: "StrongPass!123",
      role: "ADMIN",
    });
    const adminToken = signToken({ userId: admin.id, role: admin.role });

    await registerUser({
      name: "Other Admin",
      phone: "+15550000322",
      password: "StrongPass!123",
      role: "ADMIN",
    });

    await createTestCamp(adminToken);
    await new Promise((r) => setTimeout(r, 500));

    const logs = await CampSmsLog.find();
    expect(logs.length).toBe(0);
  });

  it("logs FAILED when MSG91 returns an error", async () => {
    const admin = await registerUser({
      name: "Admin",
      phone: "+15550000341",
      password: "StrongPass!123",
      role: "ADMIN",
    });

    await registerUser({
      name: "Worker",
      phone: "+15550000342",
      password: "StrongPass!123",
      role: "WORKER",
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        type: "error",
        message: "Invalid flow id",
      }),
    });

    const response = await request(app)
      .post("/api/camps/admin/create")
      .set("Authorization", `Bearer ${admin.token || signToken({ userId: admin.id, role: admin.role })}`)
      .send({
        name: "Test Camp",
        date: "2026-12-01",
        timeSlots: [{ startTime: "09:00", endTime: "12:00", capacity: 50 }],
        location: "Test Location",
        city: "Test City",
        description: "Test.",
        organizer: "Test Org",
      });
    expect(response.status).toBe(201);

    await new Promise((r) => setTimeout(r, 500));

    const logs = await CampSmsLog.find({ status: "FAILED" });
    expect(logs.length).toBe(1);
    expect(logs[0].error).toMatch(/Invalid flow id/i);
  });

  it("camp creation succeeds even when MSG91 is unavailable", async () => {
    mockFetch.mockRejectedValue(new Error("Network failure"));

    const admin = await registerUser({
      name: "Admin",
      phone: "+15550000351",
      password: "StrongPass!123",
      role: "ADMIN",
    });
    const adminToken = signToken({ userId: admin.id, role: admin.role });

    await registerUser({
      name: "Worker",
      phone: "+15550000352",
      password: "StrongPass!123",
      role: "WORKER",
    });

    const response = await request(app)
      .post("/api/camps/admin/create")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Emergency Camp",
        date: "2026-12-15",
        timeSlots: [{ startTime: "10:00", endTime: "14:00", capacity: 20 }],
        location: "City Hospital",
        city: "Delhi",
        description: "Emergency health camp.",
        organizer: "HealthRaahi",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.camp.name).toBe("Emergency Camp");

    await new Promise((r) => setTimeout(r, 500));

    const camp = await MedicalCamp.findOne({ name: "Emergency Camp" });
    expect(camp).toBeTruthy();
  });

  it("prevents duplicate SENT SMS for same camp and worker", async () => {
    const admin = await registerUser({
      name: "Admin",
      phone: "+15550000361",
      password: "StrongPass!123",
      role: "ADMIN",
    });

    await registerUser({
      name: "Worker",
      phone: "+15550000362",
      password: "StrongPass!123",
      role: "WORKER",
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ type: "success", request_id: "mock-req-002" }),
    });

    const response = await request(app)
      .post("/api/camps/admin/create")
      .set("Authorization", `Bearer ${signToken({ userId: admin.id, role: admin.role })}`)
      .send({
        name: "Duplicate Test Camp",
        date: "2026-12-01",
        timeSlots: [{ startTime: "09:00", endTime: "12:00", capacity: 50 }],
        location: "Test Location",
        city: "Test City",
        description: "Test.",
        organizer: "Test Org",
      });
    expect(response.status).toBe(201);

    await new Promise((r) => setTimeout(r, 500));

    const logsAfterFirst = await CampSmsLog.find({ status: "SENT" });
    expect(logsAfterFirst.length).toBe(1);

    const camp = await MedicalCamp.findOne({ name: "Duplicate Test Camp" });

    await sendCampCreationSms(camp!);

    const logsAfterSecond = await CampSmsLog.find({ status: "SENT" });
    expect(logsAfterSecond.length).toBe(1);
  });

  it("one failed worker does not stop other workers from receiving SMS", async () => {
    const admin = await registerUser({
      name: "Admin",
      phone: "+15550000371",
      password: "StrongPass!123",
      role: "ADMIN",
    });

    await registerUser({
      name: "Worker A",
      phone: "+15550000372",
      password: "StrongPass!123",
      role: "WORKER",
    });
    await registerUser({
      name: "Worker B",
      phone: "+15550000373",
      password: "StrongPass!123",
      role: "WORKER",
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ type: "error", message: "Provider timeout" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ type: "success", request_id: "mock-req-ok" }),
      });

    const response = await request(app)
      .post("/api/camps/admin/create")
      .set("Authorization", `Bearer ${signToken({ userId: admin.id, role: admin.role })}`)
      .send({
        name: "Partial Fail Camp",
        date: "2026-12-01",
        timeSlots: [{ startTime: "09:00", endTime: "12:00", capacity: 50 }],
        location: "Test Location",
        city: "Test City",
        description: "Test.",
        organizer: "Test Org",
      });
    expect(response.status).toBe(201);

    await new Promise((r) => setTimeout(r, 500));

    const sent = await CampSmsLog.find({ status: "SENT" });
    const failed = await CampSmsLog.find({ status: "FAILED" });
    expect(sent.length).toBe(1);
    expect(failed.length).toBe(1);
  });

  it("does not send SMS when MSG91 credentials are missing", async () => {
    delete process.env.MSG91_AUTH_KEY;
    delete process.env.MSG91_FLOW_ID;
    delete process.env.MSG91_SENDER_ID;

    const admin = await registerUser({
      name: "Admin",
      phone: "+15550000381",
      password: "StrongPass!123",
      role: "ADMIN",
    });
    const adminToken = signToken({ userId: admin.id, role: admin.role });

    await registerUser({
      name: "Worker",
      phone: "+15550000382",
      password: "StrongPass!123",
      role: "WORKER",
    });

    const response = await request(app)
      .post("/api/camps/admin/create")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Camp Without SMS",
        date: "2026-12-20",
        timeSlots: [{ startTime: "08:00", endTime: "12:00", capacity: 10 }],
        location: "Test Location",
        city: "Test City",
        description: "Test camp.",
        organizer: "Test Organizer",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    await new Promise((r) => setTimeout(r, 500));

    expect(mockFetch).not.toHaveBeenCalled();

    const logs = await CampSmsLog.find();
    expect(logs.length).toBe(0);

    process.env.MSG91_AUTH_KEY = "test-auth-key";
    process.env.MSG91_FLOW_ID = "test-flow-id";
    process.env.MSG91_SENDER_ID = "HRAAHI";
  });

  it("camp is not rolled back because of SMS failure", async () => {
    mockFetch.mockRejectedValue(new Error("Connection refused"));

    const admin = await registerUser({
      name: "Admin",
      phone: "+15550000391",
      password: "StrongPass!123",
      role: "ADMIN",
    });
    const adminToken = signToken({ userId: admin.id, role: admin.role });

    await registerUser({
      name: "Worker",
      phone: "+15550000392",
      password: "StrongPass!123",
      role: "WORKER",
    });

    const response = await request(app)
      .post("/api/camps/admin/create")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Critical Camp",
        date: "2026-12-25",
        timeSlots: [{ startTime: "10:00", endTime: "16:00", capacity: 100 }],
        location: "Main Hospital",
        city: "Mumbai",
        description: "Important camp.",
        organizer: "HealthRaahi",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    const camp = await MedicalCamp.findOne({ name: "Critical Camp" });
    expect(camp).toBeTruthy();
    expect(camp!.status).toBe("UPCOMING");
  });

  it("returns SMS status diagnostics for admin", async () => {
    const admin = await registerUser({
      name: "Admin",
      phone: "+15550000401",
      password: "StrongPass!123",
      role: "ADMIN",
    });
    await registerUser({
      name: "Worker",
      phone: "+15550000402",
      password: "StrongPass!123",
      role: "WORKER",
    });

    const response = await request(app)
      .get("/api/camps/admin/sms-status")
      .set("Authorization", `Bearer ${signToken({ userId: admin.id, role: admin.role })}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.configured).toBe(true);
    expect(response.body.data.activeWorkerCount).toBeGreaterThanOrEqual(1);
    expect(response.body.data.activeWorkerWithPhone).toBeGreaterThanOrEqual(1);
  });

  it("rejects non-admin SMS status request", async () => {
    const worker = await registerUser({
      name: "Worker",
      phone: "+15550000411",
      password: "StrongPass!123",
      role: "WORKER",
    });

    const response = await request(app)
      .get("/api/camps/admin/sms-status")
      .set("Authorization", `Bearer ${signToken({ userId: worker.id, role: worker.role })}`);

    expect(response.status).toBe(403);
  });

  it("resend SMS returns 400 when MSG91 is not configured", async () => {
    delete process.env.MSG91_AUTH_KEY;
    delete process.env.MSG91_FLOW_ID;
    delete process.env.MSG91_SENDER_ID;

    const admin = await registerUser({
      name: "Admin",
      phone: "+15550000421",
      password: "StrongPass!123",
      role: "ADMIN",
    });
    await registerUser({
      name: "Worker",
      phone: "+15550000422",
      password: "StrongPass!123",
      role: "WORKER",
    });

    const camp = await createTestCamp(
      signToken({ userId: admin.id, role: admin.role })
    );

    const response = await request(app)
      .post(`/api/camps/admin/${camp.id}/resend-sms`)
      .set("Authorization", `Bearer ${signToken({ userId: admin.id, role: admin.role })}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/not configured/i);

    process.env.MSG91_AUTH_KEY = "test-auth-key";
    process.env.MSG91_FLOW_ID = "test-flow-id";
    process.env.MSG91_SENDER_ID = "HRAAHI";
  });

  it("resend SMS triggers SMS batch for a camp", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ type: "success", request_id: "mock-resend-001" }),
    });

    const admin = await registerUser({
      name: "Admin",
      phone: "+15550000431",
      password: "StrongPass!123",
      role: "ADMIN",
    });
    await registerUser({
      name: "Worker",
      phone: "+15550000432",
      password: "StrongPass!123",
      role: "WORKER",
    });

    const camp = await createTestCamp(
      signToken({ userId: admin.id, role: admin.role })
    );

    await new Promise((r) => setTimeout(r, 500));

    const logsAfterCreate = await CampSmsLog.find({ status: "SENT" });
    expect(logsAfterCreate.length).toBe(1);

    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ type: "success", request_id: "mock-resend-002" }),
    });

    const response = await request(app)
      .post(`/api/camps/admin/${camp.id}/resend-sms`)
      .set("Authorization", `Bearer ${signToken({ userId: admin.id, role: admin.role })}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.smsResult.sent).toBe(0);
    expect(response.body.data.smsResult.skippedAlreadySent).toBe(1);
  });
});
