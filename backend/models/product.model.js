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

export async function updateProduct(id, { name, description, price_cents, image_url }) {
  const res = await pool.query(
    `UPDATE products SET name = $1, description = $2, price_cents = $3, image_url = COALESCE($4, image_url) WHERE id = $5 RETURNING *`,
    [name, description, price_cents, image_url, id]
  );
  return res.rows[0];
}

export async function deleteProduct(id) {
  const res = await pool.query(`DELETE FROM products WHERE id = $1 RETURNING *`, [id]);
  return res.rows[0];
}
