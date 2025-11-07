import pool from "../config/db.js";

// Obtener historial de compras del usuario autenticado
export async function getUserOrders(req, res) {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT 
        o.id, 
        o.total_cents, 
        o.status, 
        o.created_at,
        c.code as coupon_code,
        c.discount_percent,
        c.amount_cents as coupon_amount_cents,
        json_agg(
          json_build_object(
            'product_id', oi.product_id,
            'product_name', p.name,
            'quantity', oi.quantity,
            'unit_price_cents', oi.unit_price_cents
          )
        ) as items
      FROM orders o
      LEFT JOIN coupons c ON o.coupon_id = c.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.user_id = $1
      GROUP BY o.id, c.code, c.discount_percent, c.amount_cents
      ORDER BY o.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("getUserOrders error:", err);
    res.status(500).json({ error: "Error al obtener el historial de compras" });
  }
}

// Obtener todas las órdenes (solo admin)
export async function getAllOrders(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 100);
    const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);
    
    const result = await pool.query(
      `SELECT 
        o.id, 
        o.user_id,
        u.name as user_name,
        u.email as user_email,
        o.total_cents, 
        o.status, 
        o.created_at,
        c.code as coupon_code,
        c.discount_percent,
        c.amount_cents as coupon_amount_cents,
        json_agg(
          json_build_object(
            'product_id', oi.product_id,
            'product_name', p.name,
            'quantity', oi.quantity,
            'unit_price_cents', oi.unit_price_cents
          )
        ) as items
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN coupons c ON o.coupon_id = c.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      GROUP BY o.id, u.name, u.email, c.code, c.discount_percent, c.amount_cents
      ORDER BY o.created_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Obtener el total de órdenes para paginación
    const countResult = await pool.query("SELECT COUNT(*) FROM orders");
    const totalOrders = parseInt(countResult.rows[0].count);

    res.json({
      orders: result.rows,
      total: totalOrders,
      limit,
      offset
    });
  } catch (err) {
    console.error("getAllOrders error:", err);
    res.status(500).json({ error: "Error al obtener el historial de órdenes" });
  }
}

// Obtener detalle de una orden específica
export async function getOrderById(req, res) {
  try {
    const orderId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    // Si no es admin, solo puede ver sus propias órdenes
    const query = isAdmin
      ? `SELECT 
          o.id, 
          o.user_id,
          u.name as user_name,
          u.email as user_email,
          o.total_cents, 
          o.status, 
          o.created_at,
          c.code as coupon_code,
          c.discount_percent,
          c.amount_cents as coupon_amount_cents,
          json_agg(
            json_build_object(
              'product_id', oi.product_id,
              'product_name', p.name,
              'quantity', oi.quantity,
              'unit_price_cents', oi.unit_price_cents
            )
          ) as items
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN coupons c ON o.coupon_id = c.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE o.id = $1
        GROUP BY o.id, u.name, u.email, c.code, c.discount_percent, c.amount_cents`
      : `SELECT 
          o.id, 
          o.user_id,
          o.total_cents, 
          o.status, 
          o.created_at,
          c.code as coupon_code,
          c.discount_percent,
          c.amount_cents as coupon_amount_cents,
          json_agg(
            json_build_object(
              'product_id', oi.product_id,
              'product_name', p.name,
              'quantity', oi.quantity,
              'unit_price_cents', oi.unit_price_cents
            )
          ) as items
        FROM orders o
        LEFT JOIN coupons c ON o.coupon_id = c.id
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE o.id = $1 AND o.user_id = $2
        GROUP BY o.id, c.code, c.discount_percent, c.amount_cents`;

    const params = isAdmin ? [orderId] : [orderId, userId];
    const result = await pool.query(query, params);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Orden no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("getOrderById error:", err);
    res.status(500).json({ error: "Error al obtener la orden" });
  }
}
