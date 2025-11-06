import pool from "../config/db.js";

export async function createOrder({ client, userId, items, couponId, totalCents }) {
  // client: pool (for transaction) or pool itself
  const clientConn = client || pool;
  try {
    await clientConn.query("BEGIN");
    const orderRes = await clientConn.query(
      `INSERT INTO orders (user_id, total_cents, coupon_id, status) VALUES ($1,$2,$3,'pending') RETURNING id`,
      [userId, totalCents, couponId || null]
    );
    const orderId = orderRes.rows[0].id;

    for (const it of items) {
      await clientConn.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) VALUES ($1,$2,$3,$4)`,
        [orderId, it.productId, it.quantity, it.unitPriceCents]
      );
    }

    await clientConn.query("COMMIT");
    return orderId;
  } catch (err) {
    await clientConn.query("ROLLBACK");
    throw err;
  }
}

export async function setOrderPaid(orderId) {
  await pool.query(`UPDATE orders SET status='paid' WHERE id = $1`, [orderId]);
}

export async function getOrdersForUser(userId) {
  const res = await pool.query(`SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
  return res.rows;
}

export async function getOrderDetails(orderId, userId, isAdmin = false) {
  // Validar ownership: solo el dueño o admin pueden ver la orden
  const ownershipCheck = isAdmin 
    ? `SELECT * FROM orders WHERE id = $1`
    : `SELECT * FROM orders WHERE id = $1 AND user_id = $2`;
  
  const params = isAdmin ? [orderId] : [orderId, userId];
  const order = await pool.query(ownershipCheck, params);
  
  if (order.rowCount === 0) {
    return null; // Orden no encontrada o no pertenece al usuario
  }
  
  const items = await pool.query(
    `SELECT oi.*, p.name FROM order_items oi 
     LEFT JOIN products p ON oi.product_id = p.id 
     WHERE oi.order_id = $1`, 
    [orderId]
  );
  
  return { order: order.rows[0], items: items.rows };
}
