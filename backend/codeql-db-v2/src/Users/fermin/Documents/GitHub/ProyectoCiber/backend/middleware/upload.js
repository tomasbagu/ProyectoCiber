import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();
const allowedExt = [".jpg", ".jpeg", ".png", ".webp"];

export const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExt.includes(ext)) {
      return cb(new Error("Solo se permiten imágenes JPG/PNG/WEBP"));
    }
    cb(null, true);
  },
});
