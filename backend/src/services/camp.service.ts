import mongoose from "mongoose";
import { AppError } from "../middleware/errorHandler";
import { CampRegistration, ICampRegistration } from "../models/CampRegistration";
import { CampDoctorAssignment } from "../models/CampDoctorAssignment";
import { MedicalCamp, CampStatus } from "../models/MedicalCamp";
import { User, UserRole } from "../models/User";
import { WorkerProfile } from "../models/WorkerProfile";
import { logAuditEvent } from "./auditLog.service";

// ─── Serializers ───────────────────────────────────────────────────────────

const serializeTimeSlot = (slot: any) => ({
  startTime: slot.startTime,
  endTime: slot.endTime,
  capacity: slot.capacity,
  registeredCount: slot.registeredCount,
});

const serializeCamp = (camp: any) => ({
  id: camp._id.toString(),
  campId: camp.campId,
  name: camp.name,
  date: camp.date,
  timeSlots: camp.timeSlots.map(serializeTimeSlot),
  location: camp.location,
  city: camp.city,
  specialties: camp.specialties,
  feeType: camp.feeType,
  description: camp.description,
  organizer: camp.organizer,
  status: camp.status,
  assignedDoctors: (camp.assignedDoctors || []).map((d: any) =>
    typeof d === "object" && d._id
      ? { id: d._id.toString(), name: d.name }
      : d.toString()
  ),
  createdBy: camp.createdBy ? camp.createdBy.toString() : undefined,
  createdAt: camp.createdAt,
  updatedAt: camp.updatedAt,
});

const serializeRegistration = (reg: any) => ({
  id: reg._id.toString(),
  campId: reg.campId ? reg.campId.toString() : undefined,
  workerId: reg.workerId ? reg.workerId.toString() : undefined,
  timeSlotIndex: reg.timeSlotIndex,
  healthConcerns: reg.healthConcerns || null,
  status: reg.status,
  registeredAt: reg.registeredAt,
  createdAt: reg.createdAt,
});

// ─── Camp ID Generator ─────────────────────────────────────────────────────

async function generateCampId(): Promise<string> {
  const count = await MedicalCamp.countDocuments();
  const next = count + 1;
  return `MC-${String(next).padStart(5, "0")}`;
}

// ─── Public: List active camps ──────────────────────────────────────────────

export const listActiveCamps = async () => {
  const camps = await MedicalCamp.find({
    status: { $in: ["UPCOMING", "ONGOING"] },
  })
    .sort({ date: 1 })
    .lean();

  return camps.map(serializeCamp);
};

// ─── Public: Get camp by ID ────────────────────────────────────────────────

export const getCampById = async (campId: string) => {
  if (!mongoose.isValidObjectId(campId)) {
    throw new AppError("Invalid camp ID", 400);
  }

  const camp = await MedicalCamp.findById(campId).lean();

  if (!camp) {
    throw new AppError("Camp not found", 404);
  }

  return serializeCamp(camp);
};

// ─── Worker: Register for camp ──────────────────────────────────────────────

export const registerForCamp = async (
  userId: string,
  campId: string,
  timeSlotIndex: number,
  healthConcerns?: string
) => {
  if (!mongoose.isValidObjectId(campId)) {
    throw new AppError("Invalid camp ID", 400);
  }

  if (!Number.isInteger(timeSlotIndex) || timeSlotIndex < 0) {
    throw new AppError("Invalid time slot index", 400);
  }

  if (healthConcerns !== undefined && healthConcerns !== null) {
    if (typeof healthConcerns !== "string") {
      throw new AppError("Health concerns must be a string", 400);
    }
    if (healthConcerns.length > 500) {
      throw new AppError("Health concerns must be under 500 characters", 400);
    }
  }

  const camp = await MedicalCamp.findById(campId);

  if (!camp) {
    throw new AppError("Camp not found", 404);
  }

  if (camp.status === "CANCELLED") {
    throw new AppError("This camp has been cancelled", 400);
  }

  if (camp.status === "COMPLETED") {
    throw new AppError("This camp has already ended", 400);
  }

  if (timeSlotIndex >= camp.timeSlots.length) {
    throw new AppError("Invalid time slot index", 400);
  }

  const slot = camp.timeSlots[timeSlotIndex];

  if (slot.registeredCount >= slot.capacity) {
    throw new AppError("This time slot is full", 400);
  }

  const existing = await CampRegistration.findOne({
    campId: camp._id,
    workerId: userId,
    status: { $ne: "CANCELLED" },
  });

  if (existing) {
    throw new AppError("You are already registered for this camp", 400);
  }

  const registration = await CampRegistration.create({
    campId: camp._id,
    workerId: userId,
    timeSlotIndex,
    healthConcerns: healthConcerns || undefined,
    status: "CONFIRMED",
    registeredAt: new Date(),
  });

  camp.timeSlots[timeSlotIndex].registeredCount += 1;
  await camp.save();

  await logAuditEvent({
    actorUserId: userId,
    actorRole: "WORKER",
    action: "CAMP_REGISTERED",
    resourceType: "CAMP",
    resourceId: camp._id.toString(),
    result: "SUCCESS",
    details: {
      campName: camp.name,
      timeSlotIndex,
      campId: camp.campId,
    },
  });

  return serializeRegistration(registration);
};

// ─── Worker: List my registrations ──────────────────────────────────────────

export const listMyRegistrations = async (userId: string) => {
  const registrations = await CampRegistration.find({ workerId: userId })
    .sort({ createdAt: -1 })
    .populate("campId")
    .lean();

  return registrations.map((reg) => {
    const camp = reg.campId as any;
    return {
      ...serializeRegistration(reg),
      camp: camp
        ? {
            id: camp._id.toString(),
            campId: camp.campId,
            name: camp.name,
            date: camp.date,
            timeSlots: camp.timeSlots.map(serializeTimeSlot),
            location: camp.location,
            city: camp.city,
            specialties: camp.specialties,
            feeType: camp.feeType,
            organizer: camp.organizer,
            status: camp.status,
          }
        : null,
    };
  });
};

// ─── Worker: Cancel registration ────────────────────────────────────────────

export const cancelRegistration = async (userId: string, regId: string) => {
  if (!mongoose.isValidObjectId(regId)) {
    throw new AppError("Invalid registration ID", 400);
  }

  const registration = await CampRegistration.findById(regId);

  if (!registration) {
    throw new AppError("Registration not found", 404);
  }

  if (registration.workerId.toString() !== userId) {
    throw new AppError("You can only cancel your own registrations", 403);
  }

  if (registration.status === "CANCELLED") {
    throw new AppError("Registration is already cancelled", 400);
  }

  if (registration.status === "ATTENDED" || registration.status === "NO_SHOW") {
    throw new AppError(
      "Cannot cancel a registration that has already been attended or marked as no-show",
      400
    );
  }

  const camp = await MedicalCamp.findById(registration.campId);

  if (camp && camp.status === "COMPLETED") {
    throw new AppError("Cannot cancel registration for a completed camp", 400);
  }

  registration.status = "CANCELLED";
  await registration.save();

  if (camp) {
    const slotIndex = registration.timeSlotIndex;
    if (slotIndex < camp.timeSlots.length) {
      camp.timeSlots[slotIndex].registeredCount = Math.max(
        0,
        camp.timeSlots[slotIndex].registeredCount - 1
      );
      await camp.save();
    }

    await logAuditEvent({
      actorUserId: userId,
      actorRole: "WORKER",
      action: "CAMP_REGISTRATION_CANCELLED",
      resourceType: "CAMP",
      resourceId: camp._id.toString(),
      result: "SUCCESS",
      details: {
        campName: camp.name,
        registrationId: regId,
        campId: camp.campId,
      },
    });
  }

  return serializeRegistration(registration);
};

// ─── Doctor: List registered workers for assigned camp ──────────────────────

export const listCampRegistrations = async (
  doctorId: string,
  campId: string
) => {
  if (!mongoose.isValidObjectId(campId)) {
    throw new AppError("Invalid camp ID", 400);
  }

  const camp = await MedicalCamp.findById(campId);

  if (!camp) {
    throw new AppError("Camp not found", 404);
  }

  const assignment = await CampDoctorAssignment.findOne({
    campId: camp._id,
    doctorId,
  });

  if (!assignment) {
    throw new AppError(
      "You are not assigned to this camp",
      403
    );
  }

  const registrations = await CampRegistration.find({
    campId: camp._id,
  })
    .sort({ registeredAt: 1 })
    .populate("workerId", "name phone")
    .lean();

  return registrations.map((reg) => {
    const worker = reg.workerId as any;
    return {
      ...serializeRegistration(reg),
      worker: worker
        ? {
            id: worker._id.toString(),
            name: worker.name,
            phone: worker.phone,
          }
        : null,
    };
  });
};

// ─── Admin: List all camps ──────────────────────────────────────────────────

export const listAllCamps = async () => {
  const camps = await MedicalCamp.find()
    .sort({ date: -1 })
    .lean();

  return camps.map(serializeCamp);
};

// ─── Admin: Create camp ─────────────────────────────────────────────────────

export const createCamp = async (
  adminUserId: string,
  data: {
    name: string;
    date: string;
    timeSlots: { startTime: string; endTime: string; capacity: number }[];
    location: string;
    city: string;
    specialties?: string[];
    feeType?: "FREE" | "PAID";
    description: string;
    organizer: string;
  }
) => {
  if (!data.name || !data.name.trim()) {
    throw new AppError("Camp name is required", 400);
  }
  if (!data.date) {
    throw new AppError("Camp date is required", 400);
  }
  if (!data.location || !data.location.trim()) {
    throw new AppError("Location is required", 400);
  }
  if (!data.city || !data.city.trim()) {
    throw new AppError("City is required", 400);
  }
  if (!data.description || !data.description.trim()) {
    throw new AppError("Description is required", 400);
  }
  if (!data.organizer || !data.organizer.trim()) {
    throw new AppError("Organizer is required", 400);
  }
  if (
    !Array.isArray(data.timeSlots) ||
    data.timeSlots.length === 0
  ) {
    throw new AppError("At least one time slot is required", 400);
  }

  for (const slot of data.timeSlots) {
    if (!slot.startTime || !slot.endTime) {
      throw new AppError("Each time slot must have startTime and endTime", 400);
    }
    if (
      !Number.isInteger(slot.capacity) ||
      slot.capacity < 1
    ) {
      throw new AppError("Each time slot capacity must be a positive integer", 400);
    }
  }

  const campDate = new Date(data.date);
  if (isNaN(campDate.getTime())) {
    throw new AppError("Invalid camp date", 400);
  }

  const campId = await generateCampId();

  const camp = await MedicalCamp.create({
    campId,
    name: data.name.trim(),
    date: campDate,
    timeSlots: data.timeSlots.map((s) => ({
      startTime: s.startTime.trim(),
      endTime: s.endTime.trim(),
      capacity: s.capacity,
      registeredCount: 0,
    })),
    location: data.location.trim(),
    city: data.city.trim(),
    specialties: data.specialties || [],
    feeType: data.feeType || "FREE",
    description: data.description.trim(),
    organizer: data.organizer.trim(),
    status: "UPCOMING",
    assignedDoctors: [],
    createdBy: adminUserId,
  });

  await logAuditEvent({
    actorUserId: adminUserId,
    actorRole: "ADMIN",
    action: "CAMP_CREATED",
    resourceType: "CAMP",
    resourceId: camp._id.toString(),
    result: "SUCCESS",
    details: { campName: camp.name, campId: camp.campId },
  });

  return serializeCamp(camp);
};

// ─── Admin: Edit camp ───────────────────────────────────────────────────────

export const updateCamp = async (
  adminUserId: string,
  campId: string,
  data: {
    name?: string;
    date?: string;
    timeSlots?: { startTime: string; endTime: string; capacity: number }[];
    location?: string;
    city?: string;
    specialties?: string[];
    feeType?: "FREE" | "PAID";
    description?: string;
    organizer?: string;
  }
) => {
  if (!mongoose.isValidObjectId(campId)) {
    throw new AppError("Invalid camp ID", 400);
  }

  const camp = await MedicalCamp.findById(campId);

  if (!camp) {
    throw new AppError("Camp not found", 404);
  }

  if (camp.status === "CANCELLED") {
    throw new AppError("Cannot edit a cancelled camp", 400);
  }

  if (data.timeSlots !== undefined) {
    if (!Array.isArray(data.timeSlots) || data.timeSlots.length === 0) {
      throw new AppError("At least one time slot is required", 400);
    }

    for (const slot of data.timeSlots) {
      if (!slot.startTime || !slot.endTime) {
        throw new AppError(
          "Each time slot must have startTime and endTime",
          400
        );
      }
      if (!Number.isInteger(slot.capacity) || slot.capacity < 1) {
        throw new AppError(
          "Each time slot capacity must be a positive integer",
          400
        );
      }
    }

    const newSlots = data.timeSlots.map((s, i) => ({
      startTime: s.startTime.trim(),
      endTime: s.endTime.trim(),
      capacity: s.capacity,
      registeredCount:
        i < camp.timeSlots.length ? camp.timeSlots[i].registeredCount : 0,
    }));

    for (let i = 0; i < newSlots.length; i++) {
      if (newSlots[i].registeredCount > newSlots[i].capacity) {
        throw new AppError(
          `Cannot reduce capacity below current registrations for slot ${i + 1}`,
          400
        );
      }
    }

    camp.timeSlots = newSlots as any;
  }

  if (data.name !== undefined) camp.name = data.name.trim();
  if (data.date !== undefined) {
    const d = new Date(data.date);
    if (isNaN(d.getTime())) throw new AppError("Invalid camp date", 400);
    camp.date = d;
  }
  if (data.location !== undefined) camp.location = data.location.trim();
  if (data.city !== undefined) camp.city = data.city.trim();
  if (data.specialties !== undefined) camp.specialties = data.specialties;
  if (data.feeType !== undefined) camp.feeType = data.feeType;
  if (data.description !== undefined)
    camp.description = data.description.trim();
  if (data.organizer !== undefined) camp.organizer = data.organizer.trim();

  await camp.save();

  await logAuditEvent({
    actorUserId: adminUserId,
    actorRole: "ADMIN",
    action: "CAMP_UPDATED",
    resourceType: "CAMP",
    resourceId: camp._id.toString(),
    result: "SUCCESS",
    details: { campName: camp.name, campId: camp.campId },
  });

  return serializeCamp(camp);
};

// ─── Admin: Cancel camp ─────────────────────────────────────────────────────

export const cancelCamp = async (adminUserId: string, campId: string) => {
  if (!mongoose.isValidObjectId(campId)) {
    throw new AppError("Invalid camp ID", 400);
  }

  const camp = await MedicalCamp.findById(campId);

  if (!camp) {
    throw new AppError("Camp not found", 404);
  }

  if (camp.status === "CANCELLED") {
    throw new AppError("Camp is already cancelled", 400);
  }

  if (camp.status === "COMPLETED") {
    throw new AppError("Cannot cancel a completed camp", 400);
  }

  camp.status = "CANCELLED";
  await camp.save();

  await CampRegistration.updateMany(
    { campId: camp._id, status: "CONFIRMED" },
    { status: "CANCELLED" }
  );

  await logAuditEvent({
    actorUserId: adminUserId,
    actorRole: "ADMIN",
    action: "CAMP_CANCELLED",
    resourceType: "CAMP",
    resourceId: camp._id.toString(),
    result: "SUCCESS",
    details: { campName: camp.name, campId: camp.campId },
  });

  return serializeCamp(camp);
};

// ─── Admin: Assign doctor to camp ───────────────────────────────────────────

export const assignDoctorToCamp = async (
  adminUserId: string,
  campId: string,
  doctorId: string
) => {
  if (!mongoose.isValidObjectId(campId)) {
    throw new AppError("Invalid camp ID", 400);
  }
  if (!mongoose.isValidObjectId(doctorId)) {
    throw new AppError("Invalid doctor ID", 400);
  }

  const camp = await MedicalCamp.findById(campId);
  if (!camp) {
    throw new AppError("Camp not found", 404);
  }

  const doctor = await User.findOne({ _id: doctorId, role: "DOCTOR" });
  if (!doctor) {
    throw new AppError("Doctor not found", 404);
  }

  const existing = await CampDoctorAssignment.findOne({
    campId: camp._id,
    doctorId,
  });
  if (existing) {
    throw new AppError("Doctor is already assigned to this camp", 400);
  }

  await CampDoctorAssignment.create({
    campId: camp._id,
    doctorId,
    assignedBy: adminUserId,
    assignedAt: new Date(),
  });

  if (!camp.assignedDoctors.some((d) => d.toString() === doctorId)) {
    camp.assignedDoctors.push(doctorId as any);
    await camp.save();
  }

  return {
    campId: camp._id.toString(),
    doctorId,
    assignedBy: adminUserId,
  };
};

// ─── Admin: List camp registrations ─────────────────────────────────────────

export const adminListCampRegistrations = async (campId: string) => {
  if (!mongoose.isValidObjectId(campId)) {
    throw new AppError("Invalid camp ID", 400);
  }

  const camp = await MedicalCamp.findById(campId);
  if (!camp) {
    throw new AppError("Camp not found", 404);
  }

  const registrations = await CampRegistration.find({ campId: camp._id })
    .sort({ registeredAt: 1 })
    .populate("workerId", "name phone")
    .lean();

  return registrations.map((reg) => {
    const worker = reg.workerId as any;
    return {
      ...serializeRegistration(reg),
      worker: worker
        ? {
            id: worker._id.toString(),
            name: worker.name,
            phone: worker.phone,
          }
        : null,
    };
  });
};
