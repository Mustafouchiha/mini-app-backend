const express = require("express");
const { query } = require("../db");
const { connect } = require("../db");
const operatorAuth = require("../middleware/operatorAuth");

const router = express.Router();

// Barcha route larda operator tekshiruvi
router.use(operatorAuth);

// ── Foydalanuvchilarni qidirish ────────────────────────────────────
// GET /api/operator/users?q=telefon_yoki_ism_yoki_id
router.get("/users", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    let rows;

    if (!q) {
      // So'nggi 50 ta foydalanuvchi
      ({ rows } = await query(
        "SELECT id, public_id, name, phone, telegram, is_blocked, balance, tg_chat_id, joined FROM users ORDER BY joined DESC LIMIT 50"
      ));
    } else {
      ({ rows } = await query(
        `SELECT id, public_id, name, phone, telegram, is_blocked, balance, tg_chat_id, joined FROM users
         WHERE phone ILIKE $1 OR name ILIKE $1 OR id::text ILIKE $1 OR public_id ILIKE $1
         ORDER BY joined DESC LIMIT 30`,
        [`%${q}%`]
      ));
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Foydalanuvchiga pul qo'shish ──────────────────────────────────
// POST /api/operator/deposit  { phone, amount }
router.post("/deposit", async (req, res) => {
  try {
    const { phone, amount } = req.body;
    if (!phone || amount === undefined || amount === null) {
      return res.status(400).json({ message: "phone va amount majburiy" });
    }

    const sum = Number(amount);
    if (isNaN(sum) || sum <= 0) return res.status(400).json({ message: "Summa noto'g'ri" });

    const raw = String(phone).trim();
    const normalizedPhone = raw.replace(/\D/g, "").slice(-9);

    const { rows: found } = await query(
      `SELECT * FROM users
       WHERE phone = $1 OR public_id = $2
       LIMIT 1`,
      [normalizedPhone, raw.toUpperCase()]
    );
    if (!found[0]) return res.status(404).json({ message: "Bu raqamli foydalanuvchi topilmadi" });

    const { rows } = await query(
      "UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, phone, balance",
      [sum, found[0].id]
    );

    // Foydalanuvchiga Telegram xabari
    let botNotified = false;
    let botNote = "";
    if (found[0].tg_chat_id) {
      try {
        const { notifyUser } = require("../bot");
        await notifyUser(
          found[0].tg_chat_id,
          `💰 *Hisobingiz to'ldirildi!*\n\n` +
          `➕ Qo'shilgan summa: *${sum.toLocaleString()} so'm*\n` +
          `💼 Joriy balans: *${Number(rows[0].balance).toLocaleString()} so'm*\n\n` +
          `✅ Operator: *Mustafo Ismoiljonov*`,
          { parse_mode: "Markdown" }
        );
        botNotified = true;
      } catch (e) {
        botNote = `Bot xabar yuborilmadi: ${e.message}`;
      }
    } else {
      botNote = "Foydalanuvchida tg_chat_id yo'q (botga ulanmagan)";
    }

    res.json({
      message: `${sum.toLocaleString()} so'm qo'shildi`,
      user: rows[0],
      botNotified,
      botNote,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Foydalanuvchini o'chirish ─────────────────────────────────────
// DELETE /api/operator/users/:id
router.delete("/users/:id", async (req, res) => {
  const pool = await connect();
  const client = await pool.connect();
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "id majburiy" });

    // Operator o'zini o'chira olmaydi
    if (id === req.user.id) return res.status(400).json({ message: "O'zingizni o'chira olmaysiz" });

    await client.query("BEGIN");

    // User mahsulotlarini yopamiz (postlar ham yopilsin)
    const { rows: userProducts } = await client.query(
      "SELECT id FROM products WHERE owner_id = $1",
      [id]
    );
    const productIds = userProducts.map((p) => p.id);

    await client.query(
      "UPDATE products SET is_active = false, updated_at = NOW() WHERE owner_id = $1",
      [id]
    );

    // Offer/payment bog'lanishlarini tozalash
    if (productIds.length > 0) {
      await client.query(
        "DELETE FROM payments WHERE buyer_id = $1 OR seller_id = $1 OR product_id = ANY($2::uuid[])",
        [id, productIds]
      );
      await client.query(
        "DELETE FROM offers WHERE buyer_id = $1 OR seller_id = $1 OR product_id = ANY($2::uuid[])",
        [id, productIds]
      );
    } else {
      await client.query("DELETE FROM payments WHERE buyer_id = $1 OR seller_id = $1", [id]);
      await client.query("DELETE FROM offers WHERE buyer_id = $1 OR seller_id = $1", [id]);
    }

    const del = await client.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
    if (!del.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    }

    await client.query("COMMIT");
    res.json({ message: "Foydalanuvchi va unga tegishli postlar o'chirildi" });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch {}
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// ── Foydalanuvchini bloklash/ochish ───────────────────────────────
// PUT /api/operator/users/:id/block { blocked: true|false }
router.put("/users/:id/block", async (req, res) => {
  try {
    const { id } = req.params;
    const blocked = Boolean(req.body.blocked);
    if (id === req.user.id && blocked) {
      return res.status(400).json({ message: "O'zingizni bloklay olmaysiz" });
    }
    const { rows } = await query(
      `UPDATE users
       SET is_blocked = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, public_id, name, phone, is_blocked`,
      [blocked, id]
    );
    if (!rows[0]) return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    res.json({
      message: blocked ? "Foydalanuvchi bloklandi" : "Foydalanuvchi blokdan chiqarildi",
      user: rows[0],
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Mahsulotlarni qidirish ────────────────────────────────────────
// GET /api/operator/products?q=
router.get("/products", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    let rows;

    if (!q) {
      ({ rows } = await query(
        `SELECT p.id, p.public_id, p.name, p.price, p.unit, p.qty, p.category, p.viloyat,
                p.is_active,
                u.name AS owner_name, u.phone AS owner_phone, u.public_id AS owner_public_id, p.created_at
         FROM products p JOIN users u ON p.owner_id = u.id
         ORDER BY p.created_at DESC LIMIT 50`
      ));
    } else {
      ({ rows } = await query(
        `SELECT p.id, p.public_id, p.name, p.price, p.unit, p.qty, p.category, p.viloyat,
                p.is_active,
                u.name AS owner_name, u.phone AS owner_phone, u.public_id AS owner_public_id, p.created_at
         FROM products p JOIN users u ON p.owner_id = u.id
         WHERE (
             p.name ILIKE $1 OR p.id::text ILIKE $1 OR p.public_id ILIKE $1
             OR u.phone ILIKE $1 OR u.name ILIKE $1 OR u.public_id ILIKE $1
           )
         ORDER BY p.created_at DESC LIMIT 30`,
        [`%${q}%`]
      ));
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Mahsulotni o'chirish ──────────────────────────────────────────
// DELETE /api/operator/products/:id
router.delete("/products/:id", async (req, res) => {
  try {
    await query("UPDATE products SET is_active = false WHERE id = $1", [req.params.id]);
    res.json({ message: "Mahsulot o'chirildi" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Mahsulotni ochish/yopish ─────────────────────────────────────
// PUT /api/operator/products/:id/toggle { is_active: true|false }
router.put("/products/:id/toggle", async (req, res) => {
  try {
    const active = Boolean(req.body.is_active);
    const { rows } = await query(
      `UPDATE products
       SET is_active = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, public_id, name, is_active`,
      [active, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: "Mahsulot topilmadi" });
    res.json({
      message: active ? "Mahsulot ochildi" : "Mahsulot yopildi",
      product: rows[0],
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
