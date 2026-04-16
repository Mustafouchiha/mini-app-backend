const express = require("express");
const auth = require("../../../middleware/auth");
const operatorAuth = require("../../../middleware/operatorAuth");
const controller = require("../controllers/ReqPostController");

const router = express.Router();

router.get("/posts", controller.listPosts);
router.get("/posts/my", auth, controller.listMyPosts);
router.get("/posts/:postId", controller.getPostById);
router.post("/posts", auth, controller.createPost);
router.post("/posts/:postId/offers", auth, controller.createOffer);
router.delete("/posts/:postId", auth, controller.deleteOwnPost);

router.put("/operator/posts/:postId/approve", auth, operatorAuth, controller.approvePost);
router.put("/operator/posts/:postId/reject", auth, operatorAuth, controller.rejectPost);
router.put("/operator/posts/:postId/visibility", auth, operatorAuth, controller.togglePostVisibility);
router.delete("/operator/posts/:postId", auth, operatorAuth, controller.deletePost);
router.put("/operator/offers/:offerId/confirm-payment", auth, operatorAuth, controller.confirmOfferPayment);

module.exports = router;

