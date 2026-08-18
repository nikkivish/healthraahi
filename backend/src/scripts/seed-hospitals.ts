/**
 * Development-only script to seed Hospital records.
 *
 * Usage:  npx tsx src/scripts/seed-hospitals.ts
 *
 * This script is idempotent — running it multiple times will not create
 * duplicate hospitals. It checks for existing records by hospitalId before
 * inserting.
 *
 * IMPORTANT: This is for local development/testing only.
 * Do NOT run in production.
 */

import "dotenv/config";
import { connectDatabase, disconnectDatabase } from "../config/database";
import { Hospital } from "../models/Hospital";

interface HospitalSeed {
  hospitalId: string;
  name: string;
  registrationNumber: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
}

const SEED_HOSPITALS: HospitalSeed[] = [
  {
    hospitalId: "HOSP-DEV-001",
    name: "City General Hospital",
    registrationNumber: "REG-MH-2024-001",
    address: "123 Health Avenue, Sector 5",
    city: "Mumbai",
    state: "Maharashtra",
    phone: "+912224567890",
    email: "info@citygeneral.example",
  },
  {
    hospitalId: "HOSP-DEV-002",
    name: "Green Valley Medical Centre",
    registrationNumber: "REG-KA-2024-002",
    address: "45 Wellness Road, Indiranagar",
    city: "Bangalore",
    state: "Karnataka",
    phone: "+918023456789",
    email: "contact@greenvalley.example",
  },
  {
    hospitalId: "HOSP-DEV-003",
    name: "Sunrise Multi-Speciality Hospital",
    registrationNumber: "REG-DL-2024-003",
    address: "78 Care Lane, Lajpat Nagar",
    city: "New Delhi",
    state: "Delhi",
    phone: "+911125678901",
    email: "hello@sunrise.example",
  },
];

async function seedHospitals() {
  console.log("");
  console.log("═══════════════════════════════════════════");
  console.log("  Hospital Seed Script");
  console.log("═══════════════════════════════════════════");
  console.log("");

  await connectDatabase();

  let created = 0;
  let skipped = 0;

  for (const seed of SEED_HOSPITALS) {
    const existing = await Hospital.findOne({
      $or: [{ hospitalId: seed.hospitalId }, { registrationNumber: seed.registrationNumber }],
    });

    if (existing) {
      console.log(`  ⏭️  ${seed.name} — already exists (ID: ${existing.hospitalId}). Skipping.`);
      skipped++;
      continue;
    }

    const hospital = await Hospital.create({
      hospitalId: seed.hospitalId,
      name: seed.name,
      registrationNumber: seed.registrationNumber,
      address: seed.address,
      city: seed.city,
      state: seed.state,
      phone: seed.phone,
      email: seed.email,
      isActive: true,
    });

    console.log(`  ✅ Created: ${hospital.name}`);
    console.log(`     Hospital ID:  ${hospital.hospitalId}`);
    console.log(`     Reg Number:   ${hospital.registrationNumber}`);
    console.log(`     Location:     ${hospital.city}, ${hospital.state}`);
    console.log(`     Phone:        ${hospital.phone}`);
    console.log("");
    created++;
  }

  console.log("═══════════════════════════════════════════");
  console.log(`  Created: ${created}  |  Skipped: ${skipped}`);
  console.log("═══════════════════════════════════════════");
  console.log("");
  console.log("  DEVELOPMENT ONLY — Do not use in production.");
  console.log("");

  await disconnectDatabase();
}

seedHospitals().catch((error) => {
  console.error("Failed to seed hospitals:", error);
  process.exit(1);
});
