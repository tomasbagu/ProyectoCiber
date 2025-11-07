import pool from "../config/db.js";

export async function createProduct({ name, description, price_cents, image_url }) {
  const res = await pool.query(
    `INSERT INTO products (name, description, price_cents, image_url) VALUES ($1,$2,$3,$4) RETURNING *`,
    [name, description, price_cents, image_url]
  );
  return res.rows[0];
}

export async function getProducts(limit = 50, offset = 0) {
  const res = await pool.query(
    `SELECT id, name, description, price_cents, image_url, created_at FROM products ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return res.rows;
}

export async function getProductById(id) {
  const res = await pool.query(`SELECT * FROM products WHERE id = $1`, [id]);
  return res.rows[0];
}
