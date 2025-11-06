/**
 * Utilidades para validación segura de imágenes en el frontend
 * Implementa validaciones según OWASP para prevenir ataques
 */

// Configuración de límites
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const MIN_FILE_SIZE = 100; // 100 bytes
const MAX_WIDTH = 4000; // píxeles
const MAX_HEIGHT = 4000; // píxeles

// Tipos MIME permitidos
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
];

// Extensiones permitidas
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

/**
 * Valida que un archivo sea una imagen válida
 * @param {File} file - Archivo a validar
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export async function validateImageFile(file) {
  // 1. Verificar que existe el archivo
  if (!file) {
    return { valid: false, error: 'No se seleccionó ningún archivo' };
  }

  // 2. Validar tamaño del archivo
  if (file.size < MIN_FILE_SIZE) {
    return { valid: false, error: 'El archivo es demasiado pequeño' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `El archivo no debe superar ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }

  // 3. Validar tipo MIME
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'Tipo de archivo no permitido. Solo JPG, PNG o WEBP' };
  }

  // 4. Validar extensión del nombre de archivo
  const fileName = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
  
  if (!hasValidExtension) {
    return { valid: false, error: 'Extensión de archivo no válida' };
  }

  // 5. Verificar que el nombre no contenga caracteres peligrosos
  if (!/^[a-zA-Z0-9._-]+$/.test(file.name.replace(/\.(jpg|jpeg|png|webp)$/i, ''))) {
    return { valid: false, error: 'El nombre del archivo contiene caracteres no permitidos' };
  }

  // 6. Validar dimensiones de la imagen
  try {
    const dimensions = await getImageDimensions(file);
    
    if (dimensions.width > MAX_WIDTH || dimensions.height > MAX_HEIGHT) {
      return { 
        valid: false, 
        error: `La imagen no debe superar ${MAX_WIDTH}x${MAX_HEIGHT} píxeles` 
      };
    }

    if (dimensions.width < 10 || dimensions.height < 10) {
      return { 
        valid: false, 
        error: 'La imagen es demasiado pequeña' 
      };
    }
  } catch (err) {
    return { valid: false, error: 'No se pudo leer la imagen. Archivo corrupto' };
  }

  // 7. Validar que el archivo realmente sea una imagen (magic numbers)
  try {
    const isValidImage = await validateImageContent(file);
    if (!isValidImage) {
      return { valid: false, error: 'El archivo no es una imagen válida' };
    }
  } catch (err) {
    return { valid: false, error: 'Error validando contenido del archivo' };
  }

  return { valid: true };
}

/**
 * Obtiene las dimensiones de una imagen
 * @param {File} file - Archivo de imagen
 * @returns {Promise<{width: number, height: number}>}
 */
function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.width,
        height: img.height
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo cargar la imagen'));
    };

    img.src = url;
  });
}

/**
 * Valida el contenido real de la imagen verificando magic numbers
 * @param {File} file - Archivo a validar
 * @returns {Promise<boolean>}
 */
async function validateImageContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const arr = new Uint8Array(e.target.result).subarray(0, 12);
      
      // Verificar magic numbers
      let isValid = false;

      // JPEG: FF D8 FF
      if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) {
        isValid = file.type === 'image/jpeg';
      }
      // PNG: 89 50 4E 47 0D 0A 1A 0A
      else if (
        arr[0] === 0x89 && arr[1] === 0x50 && 
        arr[2] === 0x4E && arr[3] === 0x47 &&
        arr[4] === 0x0D && arr[5] === 0x0A &&
        arr[6] === 0x1A && arr[7] === 0x0A
      ) {
        isValid = file.type === 'image/png';
      }
      // WEBP: RIFF ... WEBP
      else if (
        arr[0] === 0x52 && arr[1] === 0x49 && 
        arr[2] === 0x46 && arr[3] === 0x46 &&
        arr[8] === 0x57 && arr[9] === 0x45 &&
        arr[10] === 0x42 && arr[11] === 0x50
      ) {
        isValid = file.type === 'image/webp';
      }

      resolve(isValid);
    };

    reader.onerror = () => {
      reject(new Error('Error leyendo el archivo'));
    };

    // Leer solo los primeros 12 bytes
    reader.readAsArrayBuffer(file.slice(0, 12));
  });
}

/**
 * Sanitiza una URL de imagen para prevenir XSS
 * @param {string} url - URL a sanitizar
 * @returns {string|null}
 */
export function sanitizeImageUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Permitir solo URLs HTTP/HTTPS o data URIs de imágenes
  try {
    const urlObj = new URL(url, window.location.origin);
    
    // Verificar que sea HTTP o HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return null;
    }

    return url;
  } catch {
    // Si falla el parseo de URL, verificar si es data URI
    if (url.startsWith('data:image/')) {
      return url;
    }
    return null;
  }
}

/**
 * Valida y prepara un archivo para upload
 * @param {File} file - Archivo a preparar
 * @returns {Promise<{success: boolean, file?: File, error?: string}>}
 */
export async function prepareImageForUpload(file) {
  const validation = await validateImageFile(file);
  
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  return { success: true, file };
}

/**
 * Crea un preview seguro de una imagen
 * @param {File} file - Archivo de imagen
 * @returns {Promise<string>}
 */
export async function createSecurePreview(file) {
  const validation = await validateImageFile(file);
  
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      resolve(e.target.result);
    };

    reader.onerror = () => {
      reject(new Error('Error creando preview'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Formatea el tamaño de archivo para mostrar
 * @param {number} bytes - Tamaño en bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export default {
  validateImageFile,
  sanitizeImageUrl,
  prepareImageForUpload,
  createSecurePreview,
  formatFileSize,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS
};
