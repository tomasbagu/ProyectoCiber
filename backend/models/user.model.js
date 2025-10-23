import pool from "../config/db.js";
import argon2 from "argon2";

// createUser: recibe name,email,password_plain y photo_url, devuelve user
export async function createUser({ name, email, password, photo_url }) {
  const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    timeCost: 3,
    memoryCost: 2 ** 16,
    parallelism: 1,
  });

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, photo_url)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, photo_url, role`,
    [name, email, hash, photo_url || null]
  );
  return result.rows[0];
}

export async function findByEmail(email) {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0];
}

export async function findById(id) {
  const result = await pool.query("SELECT id, name, email, role, photo_url, created_at FROM users WHERE id = $1", [id]);
  return result.rows[0];
}

export async function approveUser(id) {
  await pool.query("UPDATE users SET role = 'user' WHERE id = $1", [id]);
}

export async function verifyPassword(password, hash) {
  try {
    return await argon2.verify(hash, password);
  } catch (err) {
    return false;
  }
}
