import mongoose, { Document, Schema, Types } from "mongoose";

export type ChatMessageRole = "user" | "assistant";

export interface IChatMessage {
  role: ChatMessageRole;
  content: string;
  timestamp: Date;
}

export interface IChatSession extends Document {
  userId: Types.ObjectId;
  role: "WORKER" | "DOCTOR";
  messages: IChatMessage[];
  clinicalRecordId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const chatSessionSchema = new Schema<IChatSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["WORKER", "DOCTOR"],
      required: true,
    },

    messages: {
      type: [chatMessageSchema],
      default: [],
    },

    clinicalRecordId: {
      type: Schema.Types.ObjectId,
      ref: "ClinicalRecord",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const ChatSession = mongoose.model<IChatSession>(
  "ChatSession",
  chatSessionSchema
);
