import sanitizeHtml from "sanitize-html";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { minioClient, BUCKET } from "../config/minio.js";
import * as productModel from "../models/product.model.js";
import { validationResult } from "express-validator";

/**
 * Genera un nombre de archivo seguro usando UUID
 * @param {string} originalname - Nombre original del archivo
 * @returns {string} - Nombre sanitizado con UUID
 */
function generateSecureFilename(originalname) {
  const ext = path.extname(originalname).toLowerCase();
  // Usar solo UUID + extensión para evitar cualquier problema con nombres maliciosos
  return `${uuidv4()}${ext}`;
}

/**
 * Valida y sanitiza la URL de la API
 * @returns {string}
 */
function getSecureApiUrl() {
  const apiUrl = process.env.API_URL || "http://localhost:4000";
  // Validar que sea una URL válida
  try {
    new URL(apiUrl);
    return apiUrl;
  } catch {
    return "http://localhost:4000";
  }
}

export async function listProducts(req, res) {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);
    const products = await productModel.getProducts(limit, offset);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Error listando productos" });
  }
}

export async function getProduct(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const p = await productModel.getProductById(id);
    if (!p) return res.status(404).json({ error: "Producto no existe" });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo producto" });
  }
}

export async function createProduct(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, price_cents, description } = req.body;
    
    // Validar campos requeridos
    if (!name || !price_cents) {
      return res.status(400).json({ error: "Nombre y precio son requeridos" });
    }

    const priceCents = parseInt(price_cents, 10);
    if (isNaN(priceCents) || priceCents < 0 || priceCents > 999999999) {
      return res.status(400).json({ error: "Precio inválido" });
    }

    let imageUrl = null;
    if (req.file) {
      try {
        const filename = generateSecureFilename(req.file.originalname);
        
        // Subir a MinIO con metadata de seguridad
        await minioClient.putObject(
          BUCKET, 
          filename, 
          req.file.buffer, 
          req.file.size, 
          {
            "Content-Type": req.file.mimetype,
            "Cache-Control": "public, max-age=86400",
            "X-Content-Type-Options": "nosniff",
          }
        );
        
        const apiUrl = getSecureApiUrl();
        imageUrl = `${apiUrl}/api/media/users/${filename}`;
      } catch (uploadErr) {
        return res.status(500).json({ error: "Error subiendo imagen" });
      }
    }

    // Sanitizar descripción (permitir solo texto plano)
    const cleanDesc = sanitizeHtml(description || "", { 
      allowedTags: [], 
      allowedAttributes: {},
      disallowedTagsMode: 'discard'
    }).trim();

    // Sanitizar nombre (permitir solo texto plano)
    const cleanName = sanitizeHtml(name, { 
      allowedTags: [], 
      allowedAttributes: {},
      disallowedTagsMode: 'discard'
    }).trim();

    if (cleanName.length < 2 || cleanName.length > 200) {
      return res.status(400).json({ error: "Nombre debe tener entre 2 y 200 caracteres" });
    }

    const product = await productModel.createProduct({
      name: cleanName,
      description: cleanDesc.substring(0, 1000), // Limitar longitud
      price_cents: priceCents,
      image_url: imageUrl,
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: "Error creando producto" });
  }
}

export async function updateProduct(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const { name, price_cents, description } = req.body;
    
    const existing = await productModel.getProductById(id);
    if (!existing) return res.status(404).json({ error: "Producto no existe" });

    // Validar campos
    if (!name || !price_cents) {
      return res.status(400).json({ error: "Nombre y precio son requeridos" });
    }

    const priceCents = parseInt(price_cents, 10);
    if (isNaN(priceCents) || priceCents < 0 || priceCents > 999999999) {
      return res.status(400).json({ error: "Precio inválido" });
    }

    let imageUrl = null;
    if (req.file) {
      try {
        const filename = generateSecureFilename(req.file.originalname);
        
        await minioClient.putObject(
          BUCKET, 
          filename, 
          req.file.buffer, 
          req.file.size, 
          {
            "Content-Type": req.file.mimetype,
            "Cache-Control": "public, max-age=86400",
            "X-Content-Type-Options": "nosniff",
          }
        );
        
        const apiUrl = getSecureApiUrl();
        imageUrl = `${apiUrl}/api/media/users/${filename}`;
      } catch (uploadErr) {
        return res.status(500).json({ error: "Error subiendo imagen" });
      }
    }

    // Sanitizar descripción
    const cleanDesc = sanitizeHtml(description || "", { 
      allowedTags: [], 
      allowedAttributes: {},
      disallowedTagsMode: 'discard'
    }).trim();

    // Sanitizar nombre
    const cleanName = sanitizeHtml(name, { 
      allowedTags: [], 
      allowedAttributes: {},
      disallowedTagsMode: 'discard'
    }).trim();

    if (cleanName.length < 2 || cleanName.length > 200) {
      return res.status(400).json({ error: "Nombre debe tener entre 2 y 200 caracteres" });
    }

    const product = await productModel.updateProduct(id, {
      name: cleanName,
      description: cleanDesc.substring(0, 1000),
      price_cents: priceCents,
      image_url: imageUrl,
    });

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Error actualizando producto" });
  }
}

export async function deleteProduct(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const product = await productModel.deleteProduct(id);
    if (!product) return res.status(404).json({ error: "Producto no existe" });
    
    // Opcional: eliminar imagen de MinIO si existe
    if (product.image_url) {
      try {
        const filename = product.image_url.split('/').pop();
        await minioClient.removeObject(BUCKET, filename);
      } catch (minioErr) {
        // No fallar si no se puede eliminar la imagen
      }
    }

    res.json({ message: "Producto eliminado", product });
  } catch (err) {
    res.status(500).json({ error: "Error eliminando producto" });
  }
}
