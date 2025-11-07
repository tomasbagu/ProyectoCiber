import sanitizeHtml from "sanitize-html";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { minioClient, BUCKET } from "../config/minio.js";
import * as productModel from "../models/product.model.js";

export async function listProducts(req, res) {
  const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
  const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);
  const products = await productModel.getProducts(limit, offset);
  res.json(products);
}

export async function getProduct(req, res) {
  const id = parseInt(req.params.id, 10);
  const p = await productModel.getProductById(id);
  if (!p) return res.status(404).json({ error: "Producto no existe" });
  res.json(p);
}

export async function createProduct(req, res) {
  try {
    const { name, price_cents, description } = req.body;
    let imageUrl = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const filename = `${uuidv4()}${ext}`;
      await minioClient.putObject(BUCKET, filename, req.file.buffer, req.file.size, {
        "Content-Type": req.file.mimetype,
      });
      imageUrl = await minioClient.presignedGetObject(BUCKET, filename, 24 * 60 * 60);
    }

    const cleanDesc = sanitizeHtml(description || "", { allowedTags: [], allowedAttributes: {} });

    const product = await productModel.createProduct({
      name: sanitizeHtml(name, { allowedTags: [], allowedAttributes: {} }),
      description: cleanDesc,
      price_cents: parseInt(price_cents, 10),
      image_url: imageUrl,
    });

    res.status(201).json(product);
  } catch (err) {
    console.error("createProduct error:", err);
    res.status(500).json({ error: "Error creando producto" });
  }
}
