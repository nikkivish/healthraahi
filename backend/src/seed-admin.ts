/**
 * Development-only script to create an ADMIN user.
 *
 * Usage:  npx tsx src/seed-admin.ts
 *
 * This script is idempotent — running it multiple times will not create
 * duplicate admin users. It connects to the same MongoDB instance defined
 * in .env (MONGODB_URI).
 *
 * IMPORTANT: This is for local development/testing only.
 * Do NOT use these credentials in production.
 *
 * Phone normalization note:
 * The frontend Login.jsx strips all non-digit characters before sending
 * to the API: `phoneNumber.replace(/\D/g, '')`. So if a user types
 * "+919999999999", the backend receives "919999999999". The phone stored
 * in this script MUST match what the frontend would send — digits only,
 * no "+" prefix.
 */

import "dotenv/config";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { User } from "./models/User";
import { hashPassword } from "./utils/password";

// Phone must be digits-only to match frontend normalization (Login.jsx line 37).
// User types "+919999999999" → frontend sends "919999999999".
const ADMIN_PHONE = "919999999999";
const ADMIN_PASSWORD = "Admin@1234";
const ADMIN_NAME = "Dev Admin";
const ADMIN_EMAIL = "admin@healthraahi.dev";

async function seedAdmin() {
  await connectDatabase();

  // Check by email (stable) or phone (digits-only) — covers both old +prefixed
  // records and current digits-only records for true idempotency.
  const existing = await User.findOne({
    $or: [{ email: ADMIN_EMAIL }, { phone: ADMIN_PHONE }],
  });

  if (existing) {
    // Ensure phone is in the correct digits-only format (fix stale +prefix).
    const needsPhoneFix = existing.phone !== ADMIN_PHONE;
    const needsRoleFix = existing.role !== "ADMIN";
    const needsActivation = !existing.isActive;

    if (!needsPhoneFix && !needsRoleFix && !needsActivation) {
      console.log(`Admin user already exists (phone: ${ADMIN_PHONE}, role: ${existing.role}). Skipping.`);
      await disconnectDatabase();
      return;
    }

    // Fix any inconsistencies.
    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    const updates: Record<string, unknown> = {};
    if (needsPhoneFix) updates.phone = ADMIN_PHONE;
    if (needsRoleFix) updates.role = "ADMIN";
    if (needsActivation) updates.isActive = true;
    updates.passwordHash = passwordHash; // always rehash to ensure correctness

    await User.updateOne({ _id: existing._id }, { $set: updates });

    console.log("");
    console.log("═══════════════════════════════════════════");
    console.log("  ADMIN user updated (idempotent fix)");
    console.log("═══════════════════════════════════════════");
    if (needsPhoneFix) console.log(`  Phone fixed: "${existing.phone}" → "${ADMIN_PHONE}"`);
    if (needsRoleFix) console.log(`  Role fixed:  "${existing.role}" → "ADMIN"`);
    if (needsActivation) console.log("  Account reactivated.");
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log("═══════════════════════════════════════════");
    console.log("");
    console.log("  DEVELOPMENT ONLY — Do not use in production.");
    console.log("");
    await disconnectDatabase();
    return;
  }

  // Create new admin.
  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  const admin = await User.create({
    name: ADMIN_NAME,
    phone: ADMIN_PHONE,
    email: ADMIN_EMAIL,
    passwordHash,
    role: "ADMIN",
    isActive: true,
  });

  console.log("");
  console.log("═══════════════════════════════════════════");
  console.log("  ADMIN user created successfully");
  console.log("═══════════════════════════════════════════");
  console.log(`  Name:     ${admin.name}`);
  console.log(`  Phone:    ${admin.phone}`);
  console.log(`  Email:    ${admin.email}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log(`  Role:     ${admin.role}`);
  console.log(`  Active:   ${admin.isActive}`);
  console.log(`  User ID:  ${admin._id.toString()}`);
  console.log("═══════════════════════════════════════════");
  console.log("");
  console.log("  DEVELOPMENT ONLY — Do not use in production.");
  console.log("");
  console.log("  Login via frontend:");
  console.log('    Phone:    919999999999  (or +919999999999)');
  console.log('    Password: Admin@1234');
  console.log("");

  await disconnectDatabase();
}

seedAdmin().catch((error) => {
  console.error("Failed to seed admin user:", error);
  process.exit(1);
});
