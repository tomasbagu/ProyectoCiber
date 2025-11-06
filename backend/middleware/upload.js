import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();

// Extensiones y MIME types permitidos
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

// Magic numbers (file signatures) para validación de contenido
const FILE_SIGNATURES = {
  "image/jpeg": [
    [0xFF, 0xD8, 0xFF], // JPEG
  ],
  "image/png": [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG
  ],
  "image/webp": [
    [0x52, 0x49, 0x46, 0x46], // RIFF (primeros 4 bytes de WEBP)
  ]
};

/**
 * Valida que el buffer contenga una imagen válida verificando magic numbers
 * @param {Buffer} buffer - Buffer del archivo
 * @param {string} mimeType - MIME type declarado
 * @returns {boolean}
 */
function validateFileSignature(buffer, mimeType) {
  if (!buffer || buffer.length === 0) return false;
  
  const signatures = FILE_SIGNATURES[mimeType];
  if (!signatures) return false;

  // Verificar si alguna firma coincide
  for (const signature of signatures) {
    let matches = true;
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      // Para WEBP, verificar también que contenga "WEBP" en bytes 8-11
      if (mimeType === "image/webp") {
        const webpMarker = buffer.slice(8, 12).toString("ascii");
        return webpMarker === "WEBP";
      }
      return true;
    }
  }
  
  return false;
}

/**
 * Sanitiza el nombre del archivo para prevenir path traversal
 * @param {string} filename - Nombre original del archivo
 * @returns {string}
 */
function sanitizeFilename(filename) {
  // Remover caracteres peligrosos y path traversal
  return path.basename(filename)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 255); // Limitar longitud
}

export const upload = multer({
  storage,
  limits: { 
    fileSize: 2 * 1024 * 1024, // 2 MB
    files: 1, // Solo un archivo por request
  },
  fileFilter: (req, file, cb) => {
    try {
      // 1. Validar extensión del nombre de archivo
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return cb(new Error("Extensión no permitida. Solo JPG, JPEG, PNG, WEBP"));
      }

      // 2. Validar MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new Error("Tipo de archivo no permitido"));
      }

      // 3. Sanitizar nombre de archivo original
      file.originalname = sanitizeFilename(file.originalname);

      cb(null, true);
    } catch (error) {
      cb(new Error("Error validando archivo"));
    }
  },
});

/**
 * Middleware adicional para validar el contenido del archivo después de cargarlo
 * Debe usarse después de multer upload
 */
export function validateImageContent(req, res, next) {
  if (!req.file) {
    return next();
  }

  try {
    // Validar magic numbers del buffer
    if (!validateFileSignature(req.file.buffer, req.file.mimetype)) {
      return res.status(400).json({ 
        error: "El archivo no es una imagen válida o no coincide con el tipo declarado" 
      });
    }

    // Validar tamaño mínimo (evitar archivos vacíos o corruptos)
    if (req.file.size < 100) {
      return res.status(400).json({ 
        error: "El archivo es demasiado pequeño para ser una imagen válida" 
      });
    }

    next();
  } catch (error) {
    return res.status(400).json({ 
      error: "Error validando contenido del archivo" 
    });
  }
}
