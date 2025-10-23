import pool from "../config/db.js";

export async function storeRefreshToken({ userId, token, expiresAt }) {
  const result = await pool.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING id`,
    [userId, token, expiresAt]
  );
  return result.rows[0];
}

export async function findRefreshToken(token) {
  const res = await pool.query("SELECT * FROM refresh_tokens WHERE token = $1", [token]);
  return res.rows[0];
}

export async function deleteRefreshToken(token) {
  await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [token]);
}

export async function deleteAllRefreshTokensForUser(userId) {
  await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]);
}
