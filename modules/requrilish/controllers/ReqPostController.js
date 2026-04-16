const ReqPostService = require("../services/ReqPostService");

function sendError(res, err) {
  const status = err.statusCode || 500;
  return res.status(status).json({ message: err.message || "Server xatosi" });
}

async function createPost(req, res) {
  try {
    const post = await ReqPostService.createPost(req.body, req.user.id);
    res.status(201).json(post);
  } catch (err) {
    sendError(res, err);
  }
}

async function listPosts(_req, res) {
  try {
    const posts = await ReqPostService.listPosts();
    res.json(posts);
  } catch (err) {
    sendError(res, err);
  }
}

async function listMyPosts(req, res) {
  try {
    const posts = await ReqPostService.listMyPosts(req.user.id);
    res.json(posts);
  } catch (err) {
    sendError(res, err);
  }
}

async function getPostById(req, res) {
  try {
    const post = await ReqPostService.getPost(req.params.postId);
    res.json(post);
  } catch (err) {
    sendError(res, err);
  }
}

async function deleteOwnPost(req, res) {
  try {
    await ReqPostService.deletePost(req.params.postId, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    sendError(res, err);
  }
}

async function approvePost(req, res) {
  try {
    const post = await ReqPostService.approvePost(req.params.postId);
    res.json(post);
  } catch (err) {
    sendError(res, err);
  }
}

async function rejectPost(req, res) {
  try {
    const post = await ReqPostService.rejectPost(req.params.postId, req.body.reason);
    res.json(post);
  } catch (err) {
    sendError(res, err);
  }
}

async function togglePostVisibility(req, res) {
  try {
    const post = await ReqPostService.hideOrShowPost(req.params.postId, !!req.body.hide);
    res.json(post);
  } catch (err) {
    sendError(res, err);
  }
}

async function deletePost(req, res) {
  try {
    await ReqPostService.hardDeletePost(req.params.postId);
    res.json({ ok: true });
  } catch (err) {
    sendError(res, err);
  }
}

async function createOffer(req, res) {
  try {
    const offer = await ReqPostService.createOffer({
      postId: req.params.postId,
      buyerId: req.user.id,
      message: req.body.message,
    });
    res.status(201).json(offer);
  } catch (err) {
    sendError(res, err);
  }
}

async function confirmOfferPayment(req, res) {
  try {
    const offer = await ReqPostService.confirmOfferPayment(req.params.offerId, req.user.id);
    res.json(offer);
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = {
  createPost,
  listPosts,
  listMyPosts,
  getPostById,
  deleteOwnPost,
  approvePost,
  rejectPost,
  togglePostVisibility,
  deletePost,
  createOffer,
  confirmOfferPayment,
};

