import "server-only";

import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function required(name: "AWS_REGION" | "AWS_S3_BUCKET"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function client(): S3Client {
  return new S3Client({ region: required("AWS_REGION") });
}

export function s3Bucket(): string { return required("AWS_S3_BUCKET"); }

export async function createUploadUrl(key: string, mimeType: string): Promise<string> {
  return getSignedUrl(client(), new PutObjectCommand({ Bucket: s3Bucket(), Key: key, ContentType: mimeType }), { expiresIn: 300 });
}

export async function createDownloadUrl(key: string): Promise<string> {
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: s3Bucket(), Key: key }), { expiresIn: 300 });
}

export async function headMedia(key: string) {
  return client().send(new HeadObjectCommand({ Bucket: s3Bucket(), Key: key }));
}

export async function readMediaPrefix(key: string): Promise<Uint8Array> {
  const object = await client().send(
    new GetObjectCommand({ Bucket: s3Bucket(), Key: key, Range: "bytes=0-15" }),
  );
  if (!object.Body) throw new Error("S3 object body is missing");
  return object.Body.transformToByteArray();
}
