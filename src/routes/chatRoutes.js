const express = require("express");
const router = express.Router();
const controller = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.post("/init", controller.getOrCreateChat);
router.get("/my-chats", controller.getUserChats);
router.get("/:chatId", controller.getChatMessages);
router.post("/upload", controller.uploadImage);

module.exports = router;
