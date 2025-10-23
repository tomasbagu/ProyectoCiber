import pool from "../config/db.js";

export async function addComment({ productId, userId, content, rating }) {
  const res = await pool.query(
    `INSERT INTO product_comments (product_id, user_id, content, rating) VALUES ($1,$2,$3,$4) RETURNING *`,
    [productId, userId || null, content, rating || null]
  );
  return res.rows[0];
}

export async function getCommentsForProduct(productId) {
  const res = await pool.query(
    `SELECT pc.id, pc.content, pc.rating, pc.created_at, u.id as user_id, u.name as user_name FROM product_comments pc LEFT JOIN users u ON pc.user_id = u.id WHERE pc.product_id = $1 ORDER BY pc.created_at DESC`,
    [productId]
  );
  return res.rows;
}
