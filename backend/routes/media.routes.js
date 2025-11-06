import { Router } from "express";
import { param, validationResult } from "express-validator";
import { minioClient, BUCKET } from "../config/minio.js";
import path from "path";

const router = Router();

// Extensiones permitidas para servir
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

/**
 * Valida y sanitiza el nombre del archivo para prevenir path traversal
 * @param {string} filename - Nombre del archivo
 * @returns {string|null} - Nombre sanitizado o null si es inválido
 */
function validateAndSanitizeFilename(filename) {
  if (!filename || typeof filename !== "string") {
    return null;
  }

  // Remover cualquier intento de path traversal
  const basename = path.basename(filename);
  
  // Validar que no contenga caracteres peligrosos
  if (!/^[a-zA-Z0-9._-]+$/.test(basename)) {
    return null;
  }

  // Validar extensión
  const ext = path.extname(basename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return null;
  }

  // Validar longitud
  if (basename.length > 255) {
    return null;
  }

  return basename;
}

// Endpoint para servir imágenes de usuario
router.get(
  "/users/:filename",
  [
    param("filename")
      .isString()
      .isLength({ min: 1, max: 255 })
      .matches(/^[a-zA-Z0-9._-]+$/)
      .withMessage("Nombre de archivo inválido")
  ],
  async (req, res) => {
    try {
      // Validar errores de express-validator
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Nombre de archivo inválido" });
      }

      const { filename } = req.params;
      
      // Sanitizar y validar el nombre del archivo
      const sanitizedFilename = validateAndSanitizeFilename(filename);
      if (!sanitizedFilename) {
        return res.status(400).json({ error: "Nombre de archivo inválido" });
      }

      // Verificar que el objeto existe en MinIO
      let stat;
      try {
        stat = await minioClient.statObject(BUCKET, sanitizedFilename);
      } catch (err) {
        if (err.code === "NotFound") {
          return res.status(404).json({ error: "Imagen no encontrada" });
        }
        throw err;
      }

      // Validar que el objeto no sea demasiado grande (protección adicional)
      if (stat.size > 5 * 1024 * 1024) { // 5MB máximo al servir
        return res.status(400).json({ error: "Archivo demasiado grande" });
      }

      // Determinar content-type basado en extensión
      const ext = path.extname(sanitizedFilename).toLowerCase().substring(1);
      const contentTypes = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp"
      };

      const contentType = contentTypes[ext] || "application/octet-stream";

      // Headers de seguridad
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", stat.size);
      res.setHeader("Cache-Control", "public, max-age=86400, immutable");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'");
      res.setHeader("Content-Disposition", "inline");
      
      // Stream de la imagen desde MinIO
      const stream = await minioClient.getObject(BUCKET, sanitizedFilename);
      
      // Manejar errores del stream
      stream.on("error", (err) => {
        if (!res.headersSent) {
          res.status(500).json({ error: "Error al cargar la imagen" });
        }
      });

      stream.pipe(res);
    } catch (err) {
      if (!res.headersSent) {
        res.status(500).json({ error: "Error al cargar la imagen" });
      }
    }
  }
);

export default router;
