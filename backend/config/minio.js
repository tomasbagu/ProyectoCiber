import { Client } from "minio";

export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: parseInt(process.env.MINIO_PORT),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

export const BUCKET = process.env.MINIO_BUCKET || "user-photos";

export async function ensureBucket() {
  try {
    const exists = await minioClient.bucketExists(BUCKET);
    if (!exists) {
      await minioClient.makeBucket(BUCKET, "");
      console.log("✅ MinIO bucket creado:", BUCKET);
    } else {
      console.log("✅ MinIO bucket existe:", BUCKET);
    }
  } catch (err) {
    console.error("Error al verificar/crear bucket MinIO:", err.message);
    throw err;
  }
}
