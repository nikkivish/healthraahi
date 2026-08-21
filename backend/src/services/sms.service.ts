import { User } from "../models/User";
import { CampSmsLog } from "../models/CampSmsLog";

interface SmsRecipient {
  userId: string;
  phone: string;
  name: string;
}

interface SmsSendResult {
  totalWorkers: number;
  skippedNoPhone: number;
  skippedAlreadySent: number;
  sent: number;
  failed: number;
  skippedMissingConfig: number;
}

const MSG91_API_URL = "https://api.msg91.com/api/v5/flow";

function getMsg91Config() {
  return {
    authKey: process.env.MSG91_AUTH_KEY || "",
    flowId: process.env.MSG91_FLOW_ID || "",
    senderId: process.env.MSG91_SENDER_ID || "",
  };
}

function isMsg91Configured(): boolean {
  const config = getMsg91Config();
  return !!(config.authKey && config.flowId && config.senderId);
}

async function fetchEligibleWorkers(): Promise<SmsRecipient[]> {
  const workers = await User.find({ role: "WORKER", isActive: true })
    .select("_id phone name")
    .lean();

  return workers
    .filter((w) => w.phone && w.phone.trim().length > 0)
    .map((w) => ({
      userId: w._id.toString(),
      phone: w.phone.trim(),
      name: w.name,
    }));
}

async function sendSingleSms(
  phone: string,
  campName: string,
  campDate: string,
  campTime: string,
  campVenue: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = getMsg91Config();

  try {
    const response = await fetch(MSG91_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: config.authKey,
      },
      body: JSON.stringify({
        flow_id: config.flowId,
        sender: config.senderId,
        mobiles: phone,
        VAR1: campName,
        VAR2: campDate,
        VAR3: campTime,
        VAR4: campVenue,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const result = (await response.json()) as { type?: string; request_id?: string; message?: string };

    if (result.type === "success") {
      return { success: true, messageId: result.request_id };
    }

    return { success: false, error: result.message || "Unknown MSG91 error" };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error" };
  }
}

export async function sendCampCreationSms(camp: {
  _id: any;
  name: string;
  date: Date;
  timeSlots: { startTime: string; endTime: string }[];
  location: string;
  city: string;
}): Promise<SmsSendResult> {
  const result: SmsSendResult = {
    totalWorkers: 0,
    skippedNoPhone: 0,
    skippedAlreadySent: 0,
    sent: 0,
    failed: 0,
    skippedMissingConfig: 0,
  };

  if (!isMsg91Configured()) {
    console.warn(
      "[SMS] MSG91 not configured. Skipping camp creation SMS."
    );
    result.skippedMissingConfig = 1;
    return result;
  }

  const workers = await fetchEligibleWorkers();
  result.totalWorkers = workers.length;

  if (workers.length === 0) {
    return result;
  }

  const campDateStr = camp.date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const campTimeStr = camp.timeSlots
    .map((s) => `${s.startTime}-${s.endTime}`)
    .join(", ");
  const campVenue = `${camp.location}, ${camp.city}`;

  const CHUNK_SIZE = 100;

  for (let i = 0; i < workers.length; i += CHUNK_SIZE) {
    const chunk = workers.slice(i, i + CHUNK_SIZE);

    const eligibleInChunk: SmsRecipient[] = [];
    for (const worker of chunk) {
      const alreadySent = await CampSmsLog.findOne({
        campId: camp._id,
        workerUserId: worker.userId,
      });

      if (alreadySent) {
        if (alreadySent.status === "SENT") {
          result.skippedAlreadySent++;
        }
        continue;
      }

      eligibleInChunk.push(worker);
    }

    for (const worker of eligibleInChunk) {
      const sendResult = await sendSingleSms(
        worker.phone,
        camp.name,
        campDateStr,
        campTimeStr,
        campVenue
      );

      if (sendResult.success) {
        await CampSmsLog.create({
          campId: camp._id,
          workerUserId: worker.userId,
          phone: worker.phone,
          status: "SENT",
          providerMessageId: sendResult.messageId,
          sentAt: new Date(),
        });
        result.sent++;
      } else {
        await CampSmsLog.create({
          campId: camp._id,
          workerUserId: worker.userId,
          phone: worker.phone,
          status: "FAILED",
          error: sendResult.error,
          sentAt: new Date(),
        });
        result.failed++;
      }
    }
  }

  return result;
}
