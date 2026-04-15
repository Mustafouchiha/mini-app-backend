const express = require("express");
const Payment = require("../models/Payment");
const Offer   = require("../models/Offer");
const authMiddleware = require("../middleware/auth");
const { notifyUser } = require("../bot");

const router = express.Router();

function paymentEnabled() {
  if (process.env.PAYMENT_ENABLED !== undefined) return process.env.PAYMENT_ENABLED === "true";
  return false;
}

const DEFAULT_CARD = "9860160619731286";
const DEFAULT_NAME = "Mustafo Ismoiljonov";

function getOperatorCard() {
  const card = process.env.OPERATOR_CARD;
  const name = process.env.OPERATOR_NAME;
  const telegram = process.env.OPERATOR_TELEGRAM || "@Requrilish_admin";

  const isDefaultCard = !card || card === DEFAULT_CARD;

  if (paymentEnabled() && isDefaultCard) {
    return {
      ok: false,
      error: "To'lov xatosi: PAYMENT_ENABLED=true, lekin OPERATOR_CARD .env da sozlanmagan.",
    };
  }

  if (!paymentEnabled() && isDefaultCard) {
    console.log("⚠️  To'lov [CONSOLE REJIM]: OPERATOR_CARD sozlanmagan, default ishlatilmoqda");
  }

  return {
    ok: true,
    card: card || DEFAULT_CARD,
    name: name || DEFAULT_NAME,
    telegram,
  };
}

// GET /api/payments/info — operator karta ma'lumotlari
router.get("/info", authMiddleware, (_req, res) => {
  const op = getOperatorCard();
  if (!op.ok) {
    console.error("❌ PAYMENT XATO:", op.error);
    return res.status(500).json({ message: op.error });
  }
  res.json({ card: op.card, name: op.name, telegram: op.telegram });
});

// POST /api/payments — to'lov boshlash (buyer)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { offerId, cardFrom, note } = req.body;
    if (!offerId) return res.status(400).json({ message: "Offer ID majburiy" });

    const op = getOperatorCard();
    if (!op.ok) {
      console.error("❌ PAYMENT XATO:", op.error);
      return res.status(500).json({ message: op.error });
    }

    const offer = await Offer.findById(offerId);
    if (!offer)
      return res.status(404).json({ message: "Taklif topilmadi" });
    // 5% to'lovni endi mahsulot egasi (seller) amalga oshiradi
    if (offer.seller_id !== req.user.id)
      return res.status(403).json({ message: "Faqat mahsulot egasi to'lov yubora oladi" });
    if (offer.status === "paid")
      return res.status(400).json({ message: "Bu taklif allaqachon to'langan" });

    // Xaridor 5% xizmat haqini platformaga to'laydi.
    // (offer.product_price — mahsulot narxi; 5% ni to'laymiz)
    const fee = Math.round(Number(offer.product_price) * 0.05);
    if (!fee || fee <= 0) return res.status(400).json({ message: "Xizmat haqi hisoblab bo'lmadi" });

    let payment = await Payment.findByOfferId(offerId);

    if (payment) {
      payment = await Payment.updatePending(offerId, { card_from: cardFrom, note, amount: fee });
    } else {
      payment = await Payment.create({
        offer_id:   offer.id,
        buyer_id:   offer.buyer_id,
        seller_id:  offer.seller_id,
        product_id: offer.product_id,
        amount:     fee,
        card_from:  cardFrom || null,
        card_to:    op.card.replace(/\s/g, ""),
        note:       note || null,
      });
    }

    console.log(`💳 To'lov yaratildi: offer=${offerId}, miqdor=${offer.product_price}`);

    res.status(201).json({
      message:      "To'lov ma'lumotlari saqlandi",
      payment:      formatPayment(payment),
      operatorCard: op.card,
      operatorName: op.name,
    });
  } catch (err) {
    console.error("❌ Payment POST xatosi:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/payments/:offerId/confirm — to'lovni tasdiqlash (seller)
router.put("/:offerId/confirm", authMiddleware, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.offerId);
    if (!offer)
      return res.status(404).json({ message: "Taklif topilmadi" });
    if (offer.seller_id !== req.user.id)
      return res.status(403).json({ message: "Faqat sotuvchi tasdiqlashi mumkin" });

    const payment = await Payment.confirm(req.params.offerId);
    if (!payment)
      return res.status(404).json({ message: "To'lov yozuvi topilmadi" });

    // Offer statusini yangilash (status oldin 'paid' bo'lmasa)
    const updatedOffer = await Offer.updateStatus(req.params.offerId, req.user.id, "paid");

    console.log(`✅ To'lov tasdiqlandi: offer=${req.params.offerId}`);

    if (updatedOffer) {
      const offerForMsg = await Offer.findById(req.params.offerId);
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
    }

    res.json({ message: "To'lov tasdiqlandi ✅", payment: formatPayment(payment) });
  } catch (err) {
    console.error("❌ Payment confirm xatosi:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/payments/my — o'z to'lovlari tarixi
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const payments = await Payment.findByUser(req.user.id);
    res.json(payments.map(formatPayment));
  } catch (err) {
    console.error("❌ Payment my xatosi:", err.message);
    res.status(500).json({ message: err.message });
  }
});

function formatPayment(p) {
  return {
    id:           p.id,
    offer_id:     p.offer_id,
    amount:       Number(p.amount),
    status:       p.status,
    card_from:    p.card_from,
    card_to:      p.card_to,
    note:         p.note,
    created_at:   p.created_at,
    confirmed_at: p.confirmed_at,
  };
}

module.exports = router;
