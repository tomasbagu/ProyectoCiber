import { Client } from "minio";

export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: parseInt(process.env.MINIO_PORT),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

export const BUCKET = process.env.MINIO_BUCKET || "user-photos";

// Política de bucket segura - solo lectura pública para objetos específicos
const bucketPolicy = {
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Deny",
      Principal: "*",
      Action: ["s3:PutObject", "s3:DeleteObject"],
      Resource: [`arn:aws:s3:::${BUCKET}/*`]
    }
  ]
};

export async function ensureBucket() {
  try {
    const exists = await minioClient.bucketExists(BUCKET);
    if (!exists) {
      await minioClient.makeBucket(BUCKET, "");
      
      // Aplicar política de seguridad al bucket
      try {
        await minioClient.setBucketPolicy(BUCKET, JSON.stringify(bucketPolicy));
      } catch (policyErr) {
        // Si falla la política, continuar pero informar
      }
    }
  } catch (err) {
    throw err;
  }
}

/**
 * Elimina un objeto de MinIO de forma segura
 * @param {string} filename - Nombre del archivo a eliminar
 * @returns {Promise<void>}
 */
export async function deleteObject(filename) {
  try {
    // Validar que el filename no contenga path traversal
    const basename = filename.split('/').pop();
    if (basename !== filename || !/^[a-zA-Z0-9._-]+$/.test(basename)) {
      throw new Error("Nombre de archivo inválido");
    }
    
    await minioClient.removeObject(BUCKET, basename);
  } catch (err) {
    throw err;
  }
}

/**
 * Verifica si un objeto existe en MinIO
 * @param {string} filename - Nombre del archivo
 * @returns {Promise<boolean>}
 */
export async function objectExists(filename) {
  try {
    await minioClient.statObject(BUCKET, filename);
    return true;
  } catch (err) {
    return false;
  }
}
