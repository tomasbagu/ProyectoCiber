import { validationResult } from "express-validator";
import sanitizeHtml from "sanitize-html";
import pool from "../config/db.js";
import * as productModel from "../models/product.model.js";
import * as couponModel from "../models/coupon.model.js";
import * as orderModel from "../models/order.model.js";
import * as paymentModel from "../models/payment.model.js";
import { luhnCheck, detectBrand, generateProviderToken } from "../utils/payment.js";
import { encrypt } from "../utils/crypto.js";

/**
 * ⚠️ ADVERTENCIA: SIMULACIÓN DE PAGOS PARA FINES EDUCATIVOS
 * 
 * Este controlador procesa pagos SIMULADOS con tarjetas de crédito.
 * NO USAR CON TARJETAS REALES en producción.
 * 
 * Para un sistema real de pagos, integrar con:
 * - Stripe, PayPal, MercadoPago, etc.
 * - Cumplir con PCI DSS Level 1
 * - Usar tokenización del procesador
 * - NO almacenar PAN (Primary Account Number) ni CVV
 */

// Nota: nunca almacenar CVV en producción
export async function checkout(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const userId = req.user.id;
  const { items, payment, coupon } = req.body;

  // Validar tarjeta con Luhn (solo formato)
  if (!luhnCheck(payment.cardNumber)) return res.status(400).json({ error: "Número de tarjeta inválido (solo para simulación)" });

  // Validar que la tarjeta no esté expirada
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // getMonth() retorna 0-11
  
  if (payment.exp_year < currentYear || 
      (payment.exp_year === currentYear && payment.exp_month < currentMonth)) {
    return res.status(400).json({ 
      error: "La tarjeta ha expirado. Por favor usa una tarjeta válida." 
    });
  }

  // Calcular total consultando productos (evitar confiar en unit prices del cliente)
  try {
    // Usar transacción
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      let totalCents = 0;
      const detailedItems = [];
      for (const it of items) {
        const p = await client.query(
          "SELECT id, name, price_cents FROM products WHERE id = $1", 
          [it.productId]
        );
        
        if (p.rowCount === 0) {
          throw new Error(`Producto no encontrado: ${it.productId}`);
        }
        
        const product = p.rows[0];
        const unit = product.price_cents;
        
        // Validar que el producto tenga precio válido
        if (unit === null || unit < 0) {
          throw new Error(`Producto "${product.name}" no tiene un precio válido`);
        }
        
        // Validar cantidad positiva (aunque ya se valida en rutas)
        if (it.quantity < 1 || it.quantity > 100) {
          throw new Error(`Cantidad inválida para producto "${product.name}"`);
        }
        
        totalCents += unit * it.quantity;
        detailedItems.push({ 
          productId: it.productId, 
          quantity: it.quantity, 
          unitPriceCents: unit 
        });
      }

      // Aplicar cupón con lock pesimista para prevenir race conditions
      let couponId = null;
      if (coupon) {
        // SELECT FOR UPDATE bloquea la fila hasta que termine la transacción
        const couponQuery = `
          SELECT * FROM coupons 
          WHERE code = $1 
          FOR UPDATE
        `;
        const couponResult = await client.query(couponQuery, [coupon.trim().toUpperCase()]);
        
        if (couponResult.rowCount === 0) {
          throw new Error("Cupón inválido");
        }
        
        const c = couponResult.rows[0];
        
        if (c.expires_at && new Date(c.expires_at) < new Date()) {
          throw new Error("Cupón expirado");
        }
        
        // Verificar límite de uso DESPUÉS del lock
        if (c.usage_limit && c.usage_count >= c.usage_limit) {
          throw new Error("Cupón agotado");
        }
        
        // Verificar si el usuario ya usó este cupón (1 uso por persona)
        const userUsage = await client.query(
          "SELECT COUNT(*) FROM coupon_usages WHERE coupon_id = $1 AND user_id = $2",
          [c.id, userId]
        );
        if (parseInt(userUsage.rows[0].count) > 0) {
          throw new Error("Ya has usado este cupón anteriormente");
        }
        
        couponId = c.id;
        if (c.discount_percent) {
          // Validar que discount_percent esté entre 1-100
          const discountPercent = Math.min(100, Math.max(0, c.discount_percent));
          totalCents = Math.max(0, Math.round(totalCents * (100 - discountPercent) / 100));
        } else if (c.amount_cents) {
          totalCents = Math.max(0, totalCents - c.amount_cents);
        }
      }

      // Crear orden (status pending)
      const orderId = await orderModel.createOrder({ client: client, userId, items: detailedItems, couponId, totalCents });

      // Simulación de pago: si Luhn ok -> accepted, generamos provider token
      const brand = detectBrand(payment.cardNumber);
      const last4 = payment.cardNumber.slice(-4);
      const providerToken = generateProviderToken();

      // Encriptamos el token antes de guardar
      const encryptedToken = encrypt(providerToken);

      await paymentModel.storePaymentToken({ orderId, encryptedToken, brand, last4, exp_month: payment.exp_month, exp_year: payment.exp_year });

      // Marcar orden como pagada
      await orderModel.setOrderPaid(orderId);

      // Si cupón usado, incrementar uso y registrar en coupon_usages
      if (couponId) {
        await client.query("UPDATE coupons SET usage_count = usage_count + 1 WHERE id = $1", [couponId]);
        await client.query("INSERT INTO coupon_usages (coupon_id, order_id, user_id) VALUES ($1,$2,$3)", [couponId, orderId, userId]);
      }

      await client.query("COMMIT");

      // Respuesta: nunca enviar PAN, solo last4 y provider token si quieres (mejor no enviar token en claro)
      return res.json({ message: "Pago simulado exitoso", orderId, last4, brand });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("checkout error:", err);
    return res.status(500).json({ error: "Error al procesar la orden - " + err.message });
  }
}
