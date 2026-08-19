/**
 * Admin seeding logic — idempotent, safe to run on every server start.
 *
 * Usage (standalone):  npx tsx src/seed-admin.ts
 * Usage (auto):        Imported by server.ts — runs after DB connect.
 *
 * Creates or fixes the default ADMIN user. Running multiple times does NOT
 * create duplicates. On an existing admin with correct data it's a no-op.
 *
 * Phone normalization note:
 * The frontend Login.jsx strips all non-digit characters before sending
 * to the API: `phoneNumber.replace(/\D/g, '')`. So if a user types
 * "+919999999999", the backend receives "919999999999". The phone stored
 * here MUST match what the frontend would send — digits only, no "+" prefix.
 */

import { User } from "./models/User";
import { hashPassword } from "./utils/password";

const ADMIN_PHONE = "919999999999";
const ADMIN_PASSWORD = "Admin@1234";
const ADMIN_NAME = "Dev Admin";
const ADMIN_EMAIL = "admin@healthraahi.dev";

/**
 * Ensure the default ADMIN user exists and is correct.
 *
 * - If no admin exists → creates one.
 * - If admin exists with wrong phone/role/status/password → fixes it.
 * - If admin exists and is already correct → no-op.
 *
 * Safe to call on every server boot. Never throws — logs and continues.
 */
export async function ensureAdminExists(): Promise<void> {
  try {
    const existing = await User.findOne({
      $or: [{ email: ADMIN_EMAIL }, { phone: ADMIN_PHONE }],
    });

    if (existing) {
      const needsPhoneFix = existing.phone !== ADMIN_PHONE;
      const needsRoleFix = existing.role !== "ADMIN";
      const needsActivation = !existing.isActive;

      if (!needsPhoneFix && !needsRoleFix && !needsActivation) {
        console.log("[seed-admin] Admin user already exists and is correct. Skipping.");
        return;
      }

      const passwordHash = await hashPassword(ADMIN_PASSWORD);
      const updates: Record<string, unknown> = {};
      if (needsPhoneFix) updates.phone = ADMIN_PHONE;
      if (needsRoleFix) updates.role = "ADMIN";
      if (needsActivation) updates.isActive = true;
      updates.passwordHash = passwordHash;

      await User.updateOne({ _id: existing._id }, { $set: updates });

      console.log("[seed-admin] Admin user updated (idempotent fix):");
      if (needsPhoneFix) console.log(`  Phone: "${existing.phone}" → "${ADMIN_PHONE}"`);
      if (needsRoleFix) console.log(`  Role:  "${existing.role}" → "ADMIN"`);
      if (needsActivation) console.log("  Account reactivated.");
      return;
    }

    const passwordHash = await hashPassword(ADMIN_PASSWORD);

    const admin = await User.create({
      name: ADMIN_NAME,
      phone: ADMIN_PHONE,
      email: ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
      isActive: true,
    });

    console.log("[seed-admin] ADMIN user created successfully:");
    console.log(`  Phone:   ${admin.phone}`);
    console.log(`  Email:   ${admin.email}`);
    console.log(`  Role:    ${admin.role}`);
    console.log(`  User ID: ${admin._id.toString()}`);
  } catch (error) {
    console.error("[seed-admin] Failed to seed admin user:", error);
  }
}

/* ------------------------------------------------------------------ */
/*  Standalone execution (for local dev / manual re-seed)              */
/* ------------------------------------------------------------------ */
async function seedAdminStandalone(): Promise<void> {
  // Dynamically import dotenv + database — only needed when run directly,
  // NOT when imported by server.ts (which already loads env + connects).
  const [{ connectDatabase, disconnectDatabase }, dotenv] = await Promise.all([
    import("./config/database.js"),
    import("dotenv/config"),
  ]);

  await connectDatabase();

  const existing = await User.findOne({
    $or: [{ email: ADMIN_EMAIL }, { phone: ADMIN_PHONE }],
  });

  const beforePhone = existing?.phone;
  const beforeRole = existing?.role;
  const beforeActive = existing?.isActive;

  await ensureAdminExists();

  // Re-fetch for display
  const admin = await User.findOne({
    $or: [{ email: ADMIN_EMAIL }, { phone: ADMIN_PHONE }],
  });

  console.log("");
  console.log("═══════════════════════════════════════════");
  if (admin) {
    console.log("  Admin seed complete");
    console.log("═══════════════════════════════════════════");
    console.log(`  Name:     ${admin.name}`);
    console.log(`  Phone:    ${admin.phone}`);
    console.log(`  Email:    ${admin.email}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log(`  Role:     ${admin.role}`);
    console.log(`  Active:   ${admin.isActive}`);
    console.log(`  User ID:  ${admin._id.toString()}`);
  } else {
    console.log("  ERROR: Admin user was not created.");
    console.log("═══════════════════════════════════════════");
  }
  console.log("");
  console.log("  Login via frontend:");
  console.log('    Phone:    919999999999  (or +919999999999)');
  console.log(`    Password: ${ADMIN_PASSWORD}`);
  console.log("");

  await disconnectDatabase();
}

// When run directly: `npx tsx src/seed-admin.ts`
// When imported by server.ts: this block does NOT execute.
const isDirectRun =
  typeof process !== "undefined" &&
  process.argv[1] &&
  (process.argv[1].endsWith("seed-admin.ts") ||
    process.argv[1].endsWith("seed-admin.js"));

if (isDirectRun) {
  seedAdminStandalone().catch((error) => {
    console.error("Failed to seed admin user:", error);
    process.exit(1);
  });
}
