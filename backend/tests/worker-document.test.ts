import request from "supertest";
import app from "../src/app";
import { connectDatabase, disconnectDatabase } from "../src/config/database";
import { User } from "../src/models/User";
import { WorkerHealthDocument } from "../src/models/WorkerHealthDocument";
import { signToken } from "../src/utils/jwt";
import { stopMongoMemoryServer } from "./setup";

describe("Worker health documents", () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await WorkerHealthDocument.deleteMany({});
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
    const response = await request(app)
      .post("/api/auth/register")
      .send(payload);
    expect(response.status).toBe(201);
    return response.body.data.user;
  };

  const loginUser = async (payload: { phone: string; password: string }) => {
    const response = await request(app)
      .post("/api/auth/login")
      .send(payload);
    expect(response.status).toBe(200);
    return response.body.data;
  };

  const createTestWorker = async (phone = "9000000001") => {
    await registerUser({
      name: "Test Worker",
      phone,
      password: "Worker@1234",
      role: "WORKER",
    });
    return loginUser({ phone, password: "Worker@1234" });
  };

  const createTestPdfBuffer = () => {
    return Buffer.from(
      "%PDF-1.4 fake test pdf content for testing purposes only",
      "utf-8"
    );
  };

  const uploadDocument = async (
    token: string,
   overrides: Record<string, string> = {}
  ) => {
    const pdfBuffer = createTestPdfBuffer();
    return request(app)
      .post("/api/worker-documents")
      .set("Authorization", `Bearer ${token}`)
      .field("documentType", overrides.documentType || "BLOOD_TEST_REPORT")
      .field("description", overrides.description || "Test blood report")
      .attach("file", pdfBuffer, {
        filename: "blood-report.pdf",
        contentType: "application/pdf",
      });
  };

  it("allows a worker to upload a document", async () => {
    const { token } = await createTestWorker();
    const res = await uploadDocument(token);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.document.documentType).toBe("BLOOD_TEST_REPORT");
    expect(res.body.data.document.originalFileName).toBe("blood-report.pdf");
    expect(res.body.data.document.mimeType).toBe("application/pdf");
    expect(res.body.data.document.fileSize).toBeGreaterThan(0);
  });

  it("allows a worker to list their documents", async () => {
    const { token } = await createTestWorker();
    await uploadDocument(token, { description: "Doc 1" });
    await uploadDocument(token, { description: "Doc 2" });

    const res = await request(app)
      .get("/api/worker-documents/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.documents.length).toBe(2);
  });

  it("allows a worker to download their document", async () => {
    const { token } = await createTestWorker();
    const uploadRes = await uploadDocument(token);
    const docId = uploadRes.body.data.document.id;

    const res = await request(app)
      .get(`/api/worker-documents/${docId}/download`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["content-disposition"]).toContain("attachment");
  });

  it("allows a worker to delete their document", async () => {
    const { token } = await createTestWorker();
    const uploadRes = await uploadDocument(token);
    const docId = uploadRes.body.data.document.id;

    const delRes = await request(app)
      .delete(`/api/worker-documents/${docId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    const listRes = await request(app)
      .get("/api/worker-documents/me")
      .set("Authorization", `Bearer ${token}`);

    expect(listRes.body.data.documents.length).toBe(0);
  });

  it("prevents Worker B from accessing Worker A's document", async () => {
    const workerA = await createTestWorker("9000000001");
    const workerB = await createTestWorker("9000000002");

    const uploadRes = await uploadDocument(workerA.token);
    const docId = uploadRes.body.data.document.id;

    const res = await request(app)
      .get(`/api/worker-documents/${docId}`)
      .set("Authorization", `Bearer ${workerB.token}`);

    expect(res.status).toBe(403);
  });

  it("prevents Worker B from deleting Worker A's document", async () => {
    const workerA = await createTestWorker("9000000003");
    const workerB = await createTestWorker("9000000004");

    const uploadRes = await uploadDocument(workerA.token);
    const docId = uploadRes.body.data.document.id;

    const res = await request(app)
      .delete(`/api/worker-documents/${docId}`)
      .set("Authorization", `Bearer ${workerB.token}`);

    expect(res.status).toBe(403);

    const listRes = await request(app)
      .get("/api/worker-documents/me")
      .set("Authorization", `Bearer ${workerA.token}`);

    expect(listRes.body.data.documents.length).toBe(1);
  });

  it("prevents non-workers from uploading documents", async () => {
    const adminData = await registerUser({
      name: "Admin User",
      phone: "9100000001",
      password: "Admin@1234",
      role: "ADMIN",
    });
    const { token } = await loginUser({
      phone: "9100000001",
      password: "Admin@1234",
    });

    const pdfBuffer = createTestPdfBuffer();
    const res = await request(app)
      .post("/api/worker-documents")
      .set("Authorization", `Bearer ${token}`)
      .field("documentType", "BLOOD_TEST_REPORT")
      .attach("file", pdfBuffer, {
        filename: "test.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(403);
  });

  it("rejects unsupported file types", async () => {
    const { token } = await createTestWorker();
    const textBuffer = Buffer.from("not a valid file type");

    const res = await request(app)
      .post("/api/worker-documents")
      .set("Authorization", `Bearer ${token}`)
      .field("documentType", "OTHER")
      .attach("file", textBuffer, {
        filename: "test.txt",
        contentType: "text/plain",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects upload without a file", async () => {
    const { token } = await createTestWorker();

    const res = await request(app)
      .post("/api/worker-documents")
      .set("Authorization", `Bearer ${token}`)
      .field("documentType", "BLOOD_TEST_REPORT");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects upload without documentType", async () => {
    const { token } = await createTestWorker();
    const pdfBuffer = createTestPdfBuffer();

    const res = await request(app)
      .post("/api/worker-documents")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", pdfBuffer, {
        filename: "test.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects unauthenticated access", async () => {
    const res = await request(app).get("/api/worker-documents/me");
    expect(res.status).toBe(401);
  });
});
