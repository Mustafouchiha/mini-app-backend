const { query } = require("../../../db");
const User = require("../../../models/User");
const ReqPostModel = require("../models/ReqPostModel");
const ReqTelegramService = require("./ReqTelegramService");

const ALLOWED_STATUSES = [
  "pending_approval",
  "pending_payment",
  "active",
  "hidden",
  "deleted",
];

const STATUS_TRANSITIONS = {
  pending_approval: ["pending_payment", "deleted"],
  pending_payment: ["active", "deleted"],
  active: ["hidden", "deleted"],
  hidden: ["active", "deleted"],
  deleted: [],
};

const paymentLocks = new Set();

function assertTransition(currentStatus, nextStatus) {
  if (!ALLOWED_STATUSES.includes(nextStatus)) {
    const err = new Error("Noto'g'ri status");
    err.statusCode = 400;
    throw err;
  }
  if (!STATUS_TRANSITIONS[currentStatus]?.includes(nextStatus)) {
    const err = new Error(`Status o'tishi mumkin emas: ${currentStatus} -> ${nextStatus}`);
    err.statusCode = 400;
    throw err;
  }
}

function normalizePost(post) {
  if (!post) return null;
  return {
    ...post,
    ownerId: post.owner_id || null,
    ownerName: post.owner_name || null,
    ownerPhone: post.owner_phone || null,
    ownerTelegram: post.owner_telegram || null,
    title: post.title,
    description: post.description || "",
    location: post.location || "",
    photos: Array.isArray(post.photos) ? post.photos : post.photos ? [post.photos] : [],
    createdAt: post.created_at,
    updatedAt: post.updated_at,
  };
}

async function createPost(payload, userId) {
  const owner = await User.findById(userId);
  const post = await ReqPostModel.createPost({ ...payload, owner_id: userId });
  await ReqTelegramService.notifyOperatorsNewPost(post, owner);
  return normalizePost(post);
}

async function listPosts() {
  const posts = await ReqPostModel.getVisiblePosts();
  return posts.map(normalizePost);
}

async function listMyPosts(userId) {
  const posts = await ReqPostModel.getByUser(userId);
  return posts.map(normalizePost);
}

async function getPost(postId) {
  const post = await ReqPostModel.getById(postId);
  if (!post || post.status === "deleted") {
    throw Object.assign(new Error("Post topilmadi"), { statusCode: 404 });
  }
  return normalizePost(post);
}

async function approvePost(postId) {
  const post = await ReqPostModel.getById(postId);
  if (!post) throw Object.assign(new Error("Post topilmadi"), { statusCode: 404 });
  assertTransition(post.status, "pending_payment");
  const updated = await ReqPostModel.updateStatus(postId, "pending_payment");
  await ReqTelegramService.notifyPostApproved(updated);
  return normalizePost(updated);
}

async function rejectPost(postId, reason) {
  const post = await ReqPostModel.getById(postId);
  if (!post) throw Object.assign(new Error("Post topilmadi"), { statusCode: 404 });
  assertTransition(post.status, "deleted");
  const updated = await ReqPostModel.updateStatus(postId, "deleted", reason || "Operator rad etdi");
  await ReqTelegramService.notifyPostRejected(updated, reason);
  return normalizePost(updated);
}

async function hideOrShowPost(postId, shouldHide) {
  const post = await ReqPostModel.getById(postId);
  if (!post) throw Object.assign(new Error("Post topilmadi"), { statusCode: 404 });
  const nextStatus = shouldHide ? "hidden" : "active";
  assertTransition(post.status, nextStatus);
  return normalizePost(await ReqPostModel.updateStatus(postId, nextStatus));
}

async function hardDeletePost(postId) {
  await query(`DELETE FROM requrilish_posts WHERE id=$1`, [postId]);
}

async function deletePost(postId, userId) {
  const post = await ReqPostModel.getById(postId);
  if (!post) throw Object.assign(new Error("Post topilmadi"), { statusCode: 404 });
  if (post.owner_id !== userId) {
    const err = new Error("Ruxsat yo'q");
    err.statusCode = 403;
    throw err;
  }
  return normalizePost(await ReqPostModel.updateStatus(postId, "deleted", "Foydalanuvchi o'chirdi"));
}

async function markUserDeleted(userId) {
  await ReqPostModel.nullOwnerForUser(userId);
}

async function createOffer({ postId, buyerId, message }) {
  const { rows } = await query(
    `INSERT INTO requrilish_offers (post_id, buyer_id, message, status)
     VALUES ($1,$2,$3,'pending')
     RETURNING *`,
    [postId, buyerId, message || ""]
  );
  return rows[0];
}

async function confirmOfferPayment(offerId, operatorId) {
  if (paymentLocks.has(offerId)) {
    const err = new Error("Ushbu to'lov allaqachon qayta ishlanmoqda");
    err.statusCode = 409;
    throw err;
  }
  paymentLocks.add(offerId);
  try {
    const { rows } = await query(
      `UPDATE requrilish_offers
       SET status='paid', paid_at=NOW(), operator_confirmed_by=$2
       WHERE id=$1 AND status!='paid'
       RETURNING *`,
      [offerId, operatorId]
    );
    const offer = rows[0];
    if (!offer) throw Object.assign(new Error("Offer topilmadi yoki allaqachon paid"), { statusCode: 404 });

    const post = await ReqPostModel.getById(offer.post_id);
    const buyer = await User.findById(offer.buyer_id);
    const seller = post?.owner_id ? await User.findById(post.owner_id) : null;
    if (post && seller && buyer) {
      await ReqTelegramService.notifyOfferPaymentDetails({ buyer, seller, post });
      await ReqPostModel.updateStatus(post.id, "deleted");
    }
    return offer;
  } finally {
    paymentLocks.delete(offerId);
  }
}

module.exports = {
  createPost,
  listPosts,
  listMyPosts,
  getPost,
  approvePost,
  rejectPost,
  hideOrShowPost,
  hardDeletePost,
  deletePost,
  markUserDeleted,
  createOffer,
  confirmOfferPayment,
};

