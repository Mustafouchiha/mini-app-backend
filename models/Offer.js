<<<<<<< HEAD
const express = require("express");
const Offer = require("../models/Offer");
const Product = require("../models/Product");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");
const { notifyUser } = require("../bot");

const router = express.Router();

// POST /api/offers — send offer
router.post("/", authMiddleware, async (req, res) => {
  try {
    if (req.user.is_blocked) {
      return res.status(403).json({ message: "Siz bloklangansiz. Taklif yubora olmaysiz" });
    }

    const { productId, message } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Mahsulot ID majburiy" });
    }

    const product = await Product.findById(productId);
    if (!product || !product.is_active) {
      return res.status(404).json({ message: "Mahsulot topilmadi" });
    }

    if (product.owner_id === req.user.id) {
      return res.status(400).json({ message: "O'z mahsulotingizga taklif yubora olmaysiz" });
    }

    const existing = await Offer.findOne({
      product_id: productId,
      buyer_id: req.user.id,
      status: "pending",
    });
    if (existing) {
      return res.status(400).json({ message: "Bu mahsulotga allaqachon taklif yuborgan" });
    }

    const offer = await Offer.create({
      product_id: productId,
      buyer_id:   req.user.id,
      seller_id:  product.owner_id,
      message:    message || "",
    });

    // Notify seller via Telegram
    const seller = await User.findById(product.owner_id);
    if (seller?.tg_chat_id) {
      const MINI_APP_URL = process.env.MINI_APP_URL || 'https://frontend-353d.vercel.app/';
      await notifyUser(
        seller.tg_chat_id,
        `📦 Yangi taklif keldi!\n\n` +
        `👤 Xaridor: ${req.user.public_id || req.user.id}\n` +
        `🧱 Mahsulot: ${product.name}\n` +
        `💰 Narx: ${Number(product.price).toLocaleString()} so'm\n` +
        (message ? `💬 Xabar: ${message}\n` : '') +
        `\nReMarket'da ko'rish →`,
        {
          reply_markup: {
            inline_keyboard: [[{
              text: '📋 Taklifni ko\'rish',
              web_app: { url: MINI_APP_URL },
            }]],
          },
        }
      );
    }

    res.status(201).json({
      id:              offer.id,
      productId:       product.id,
      productPublicId: product.public_id,
      productName:     product.name,
      productPrice:    Number(product.price),
      productUnit:     product.unit,
      buyerId:         req.user.id,
      buyerPublicId:   req.user.public_id,
      sellerId:        product.owner_id,
      status:          offer.status,
      sentAt:          offer.created_at,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/offers — received offers (seller)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const offers = await Offer.findBySeller(req.user.id);

    const formatted = offers.map((o) => ({
      id:              o.id,
      productId:       o.product_id,
      productPublicId: o.product_public_id,
      productName:     o.product_name,
      productPrice:    Number(o.product_price),
      productUnit:     o.product_unit,
      buyerId:         o.buyer_id,
      buyerPublicId:   o.buyer_public_id,
      ownerId:         o.seller_id,
      status:          o.status,
      sentAt:          o.created_at,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/offers/sent — buyer's sent offers
router.get("/sent", authMiddleware, async (req, res) => {
  try {
    const offers = await Offer.findByBuyer(req.user.id);

    const formatted = offers.map((o) => ({
      id:              o.id,
      productId:       o.product_id,
      productPublicId: o.product_public_id,
      productName:     o.product_name,
      productPrice:    Number(o.product_price),
      productUnit:     o.product_unit,
      sellerId:        o.seller_id,
      sellerPublicId:  o.seller_public_id,
      sellerName:      o.status === "paid" ? o.seller_name : undefined,
      sellerPhone:     o.status === "paid" ? o.seller_phone : undefined,
      sellerTelegram:  o.status === "paid" ? o.seller_telegram : undefined,
      status:          o.status,
      sentAt:          o.created_at,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/offers/:id/paid — mark paid (seller confirms), auto soft-delete product
router.put("/:id/paid", authMiddleware, async (req, res) => {
  try {
    const updated = await Offer.updateStatus(req.params.id, req.user.id, "paid");
    if (!updated) {
      return res.status(404).json({ message: "Taklif topilmadi yoki ruxsat yo'q" });
    }

    // Auto soft-delete product from feed (it's sold)
    await Product.softDelete(updated.product_id);

    // Notify buyer via bot
    const offerForMsg = await Offer.findById(updated.id);
    if (offerForMsg?.buyer_tg_chat_id && offerForMsg?.seller_phone && offerForMsg?.seller_telegram) {
      await notifyUser(
        offerForMsg.buyer_tg_chat_id,
        `✅ To'lov tasdiqlandi!\n\nSotuvchi kontaktingiz:\n` +
        `📞 Telefon: +998 ${offerForMsg.seller_phone}\n` +
        `✈️ Telegram: ${offerForMsg.seller_telegram}\n` +
        `👤 Ism: ${offerForMsg.seller_name}\n`,
        { parse_mode: "Markdown" }
      );
    }

    res.json({
      message: "To'lov tasdiqlandi",
      id: updated.id,
      productId: updated.product_id, // Frontend uses this to remove from UI
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
=======
const { query } = require("../db");

const Offer = {
  async create({ product_id, buyer_id, seller_id, message = "" }) {
    const { rows } = await query(
      `INSERT INTO offers (product_id, buyer_id, seller_id, message)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [product_id, buyer_id, seller_id, message]
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await query(
      `SELECT o.*,
              p.name AS product_name, p.price AS product_price, p.unit AS product_unit,
               b.tg_chat_id AS buyer_tg_chat_id,
              s.name AS seller_name, s.phone AS seller_phone, s.telegram AS seller_telegram
       FROM offers o
       JOIN products p ON p.id = o.product_id
       JOIN users b ON b.id = o.buyer_id
       JOIN users s ON s.id = o.seller_id
       WHERE o.id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async findOne({ product_id, buyer_id, status }) {
    const { rows } = await query(
      `SELECT * FROM offers WHERE product_id=$1 AND buyer_id=$2 AND status=$3 LIMIT 1`,
      [product_id, buyer_id, status]
    );
    return rows[0] || null;
  },

  // seller sifatida kelgan takliflar
  async findBySeller(seller_id) {
    const { rows } = await query(
      `SELECT o.*,
              p.name AS product_name, p.public_id AS product_public_id,
              p.price AS product_price, p.unit AS product_unit, p.photo AS product_photo,
              b.public_id AS buyer_public_id
       FROM offers o
       JOIN products p ON p.id = o.product_id
       JOIN users b ON b.id = o.buyer_id
       WHERE o.seller_id = $1
       ORDER BY o.created_at DESC`,
      [seller_id]
    );
    return rows;
  },

  // buyer sifatida yuborgan takliflar
  async findByBuyer(buyer_id) {
    const { rows } = await query(
      `SELECT o.*,
              p.name AS product_name, p.public_id AS product_public_id,
              p.price AS product_price, p.unit AS product_unit, p.photo AS product_photo,
              s.name AS seller_name, s.phone AS seller_phone, s.telegram AS seller_telegram,
              s.public_id AS seller_public_id
       FROM offers o
       JOIN products p ON p.id = o.product_id
       JOIN users s ON s.id = o.seller_id
       WHERE o.buyer_id = $1
       ORDER BY o.created_at DESC`,
      [buyer_id]
    );
    return rows;
  },

  async updateStatus(id, seller_id, status) {
    const { rows } = await query(
      `UPDATE offers SET status=$1, updated_at=NOW()
       WHERE id=$2 AND seller_id=$3 AND status != $1 RETURNING *`,
      [status, id, seller_id]
    );
    return rows[0] || null;
  },
};

module.exports = Offer;
>>>>>>> 83642868c3da3a35e2a0e0a4cf296ed3de904c8a
