import pool from "../config/db.js";

export async function findCouponByCode(code) {
  const res = await pool.query(`SELECT * FROM coupons WHERE code = $1`, [code]);
  return res.rows[0];
}

export async function incrementCouponUsage(id) {
  await pool.query(`UPDATE coupons SET usage_count = usage_count + 1 WHERE id = $1`, [id]);
}

export async function checkUserCouponUsage(couponId, userId) {
  const res = await pool.query(
    `SELECT COUNT(*) FROM coupon_usages WHERE coupon_id = $1 AND user_id = $2`,
    [couponId, userId]
  );
  return parseInt(res.rows[0].count) > 0;
}
