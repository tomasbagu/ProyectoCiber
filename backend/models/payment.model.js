import pool from "../config/db.js";

export async function storePaymentToken({ orderId, encryptedToken, brand, last4, exp_month, exp_year }) {
  const res = await pool.query(
    `INSERT INTO payment_tokens (order_id, provider_token, brand, last4, exp_month, exp_year) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [orderId, encryptedToken, brand, last4, exp_month, exp_year]
  );
  return res.rows[0];
}
