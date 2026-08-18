import mongoose from "mongoose";
import * as dotenv from "dotenv";
import path from "path";
import { User } from "./models/User";
import { DoctorProfile } from "./models/DoctorProfile";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error("❌ No MongoDB URI found in environment variables.");
  process.exit(1);
}

function generateDoctorId(): string {
  return `DR-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;
}

function generatePendingRegNumber(): string {
  return `PENDING-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;
}

async function seedDoctorProfiles() {
  console.log("🏥 Doctor Profile Migration Script");
  console.log("=".repeat(60));

  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB\n");

  const doctorUsers = await User.find({ role: "DOCTOR" });
  console.log(`Found ${doctorUsers.length} DOCTOR user(s)\n`);

  let created = 0;
  let skipped = 0;

  for (const user of doctorUsers) {
    const userId = user._id as mongoose.Types.ObjectId;
    const existingProfile = await DoctorProfile.findOne({ userId });

    if (existingProfile) {
      console.log(`⏭️  ${user.name} (${user.phone}) — profile already exists (ID: ${existingProfile.doctorId})`);
      skipped++;
      continue;
    }

    const doctorId = generateDoctorId();
    const medicalRegistrationNumber = generatePendingRegNumber();

    await DoctorProfile.create({
      userId,
      doctorId,
      fullName: user.name,
      specialization: "General Medicine",
      medicalRegistrationNumber,
      phone: user.phone,
      isVerified: false,
      verificationStatus: "PENDING",
    });

    console.log(`✅ Created profile for ${user.name} (${user.phone})`);
    console.log(`   Doctor ID: ${doctorId}`);
    console.log(`   Reg Number: ${medicalRegistrationNumber}`);
    console.log(`   Specialization: General Medicine (default)`);
    console.log(`   Verification: PENDING`);
    created++;
  }

  console.log("\n" + "=".repeat(60));
  console.log(`✅ Created: ${created} profile(s)`);
  console.log(`⏭️  Skipped: ${skipped} (already had profile)`);
  console.log("=".repeat(60));

  if (created > 0) {
    console.log("\n⚠️  Doctors should update their specialization and registration number");
    console.log("   via the profile page after logging in.");
  }

  await mongoose.disconnect();
  console.log("\nDone.");
}

seedDoctorProfiles().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
