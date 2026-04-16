const User = require("../../../models/User");
const { notifyUser, getBot } = require("../../../bot");
const { query } = require("../../../db");

const MAIN_OPERATOR_PHONE = "331350206";

function phoneCore(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("998") ? digits.slice(-9) : digits.slice(-9);
}

async function getOperators() {
  const { rows } = await query(
    `SELECT id, tg_chat_id, phone, is_operator
     FROM users
     WHERE is_operator=true OR phone=$1`,
    [MAIN_OPERATOR_PHONE]
  );
  return rows;
}

async function notifyOperatorsNewPost(post, owner) {
  const bot = getBot(false);
  if (!bot) return;
  const operators = await getOperators();
  const url = `${process.env.MINI_APP_URL || "https://frontend-353d.vercel.app/"}?postId=${post.id}&screen=operator_post`;
  const text =
    `Yangi ReQurilish posti tekshiruvda.\n\n` +
    `Nomi: ${post.title}\n` +
    `Narxi: ${Number(post.price).toLocaleString()} so'm\n` +
    `Egası: ${owner?.name || "Noma'lum"}\n` +
    `Link: ${url}`;
  for (const op of operators) {
    if (op.tg_chat_id) {
      await notifyUser(op.tg_chat_id, text);
    }
  }
}

async function notifyPostApproved(post) {
  if (!post.owner_id) return;
  const owner = await User.findById(post.owner_id);
  if (!owner?.tg_chat_id) return;
  await notifyUser(owner.tg_chat_id, "Postingiz tekshirilyapti (30-60 min)");
}

async function notifyPostRejected(post, reason) {
  if (!post.owner_id) return;
  const owner = await User.findById(post.owner_id);
  if (!owner?.tg_chat_id) return;
  await notifyUser(owner.tg_chat_id, `Postingiz rad etildi.\nSabab: ${reason || "Ko'rsatilmagan"}`);
}

async function notifyOfferPaymentDetails({ buyer, seller, post }) {
  const productInfo = `Mahsulot: ${post.title}\nNarx: ${Number(post.price).toLocaleString()} so'm`;
  if (buyer?.tg_chat_id) {
    await notifyUser(
      buyer.tg_chat_id,
      `To'lov tasdiqlandi.\nSotuvchi ma'lumoti:\n${seller.name}\n${seller.phone}\n${seller.telegram || ""}\n\n${productInfo}`
    );
  }
  if (seller?.tg_chat_id) {
    await notifyUser(
      seller.tg_chat_id,
      `Xaridor ma'lumoti:\n${buyer.name}\n${buyer.phone}\n${buyer.telegram || ""}\n\n${productInfo}`
    );
  }
}

function ensureMainOperatorImmutable(targetUser) {
  if (phoneCore(targetUser?.phone) === MAIN_OPERATOR_PHONE) {
    const err = new Error("Main operatorga bu amalni bajarib bo'lmaydi");
    err.statusCode = 400;
    throw err;
  }
}

module.exports = {
  MAIN_OPERATOR_PHONE,
  getOperators,
  notifyOperatorsNewPost,
  notifyPostApproved,
  notifyPostRejected,
  notifyOfferPaymentDetails,
  ensureMainOperatorImmutable,
};

