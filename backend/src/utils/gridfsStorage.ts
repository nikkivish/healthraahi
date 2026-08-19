/**
 * GridFS storage utility for worker health documents.
 *
 * Uses MongoDB GridFS (via the native `mongodb` driver bundled with Mongoose)
 * so files persist across restarts and work in any deployment with MongoDB.
 *
 * For high-traffic production, replace with S3 / GCS / Azure Blob and
 * update uploadFile / downloadFile / deleteFile accordingly.
 */

import mongoose from "mongoose";
import { Readable } from "stream";

const BUCKET_NAME = "worker_documents";
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

function getBucket(): mongoose.mongo.GridFSBucket {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database not connected — cannot access GridFS");
  }
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
}

export interface UploadResult {
  fileId: mongoose.Types.ObjectId;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export async function uploadFile(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<UploadResult> {
  const bucket = getBucket();
  const fileName = `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  return new Promise<UploadResult>((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(fileName, {
      metadata: { originalName, contentType: mimeType },
    });

    const readableStream = new Readable();
    readableStream.push(fileBuffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);

    uploadStream.on("finish", () => {
      resolve({
        fileId: uploadStream.id,
        fileName,
        mimeType,
        fileSize: fileBuffer.length,
      });
    });

    uploadStream.on("error", (err) => {
      reject(err);
    });
  });
}

export async function downloadFile(
  fileId: mongoose.Types.ObjectId
): Promise<{ stream: Readable; fileName: string; mimeType: string; fileSize: number }> {
  const bucket = getBucket();
  const filesCollection = mongoose.connection.db!.collection(`${BUCKET_NAME}.files`);

  const fileDoc = await filesCollection.findOne({ _id: fileId });
  if (!fileDoc) {
    throw new Error("File not found in GridFS");
  }

  const downloadStream = bucket.openDownloadStream(fileId);

  return {
    stream: downloadStream,
    fileName: fileDoc.filename,
    mimeType: fileDoc.contentType || "application/octet-stream",
    fileSize: fileDoc.length,
  };
}

export async function deleteFile(fileId: mongoose.Types.ObjectId): Promise<void> {
  const bucket = getBucket();
  await bucket.delete(fileId);
}

export async function downloadFileFromBucket(
  bucketName: string,
  fileId: mongoose.Types.ObjectId
): Promise<{ stream: Readable; fileName: string; mimeType: string; fileSize: number }> {
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db!, { bucketName });
  const filesCollection = mongoose.connection.db!.collection(`${bucketName}.files`);

  const fileDoc = await filesCollection.findOne({ _id: fileId });
  if (!fileDoc) {
    throw new Error("File not found in GridFS");
  }

  const downloadStream = bucket.openDownloadStream(fileId);

  return {
    stream: downloadStream,
    fileName: fileDoc.filename,
    mimeType: fileDoc.contentType || fileDoc.metadata?.contentType || "application/octet-stream",
    fileSize: fileDoc.length,
  };
}

export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

export function isAllowedFileSize(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= MAX_FILE_SIZE_BYTES;
}

export { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES, BUCKET_NAME };
