import pool from "../config/db.js";

export async function findCouponByCode(code) {
  const res = await pool.query(`SELECT * FROM coupons WHERE code = $1`, [code]);
  return res.rows[0];
}

export async function incrementCouponUsage(id) {
  await pool.query(`UPDATE coupons SET usage_count = usage_count + 1 WHERE id = $1`, [id]);
}
