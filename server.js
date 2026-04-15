require("dotenv").config();

const app = require("./app");
const { connect } = require("./db");

async function start() {
  await connect();

  const { getBot } = require('./bot');
  const botTokenSet = !!process.env.TELEGRAM_BOT_TOKEN;
  // Default: polling yoqilgan. Faqat BOT_POLLING_ENABLED=false bo'lsa o'chadi.
  const pollingEnabled = process.env.BOT_POLLING_ENABLED !== "false";
  if (botTokenSet && pollingEnabled) {
    getBot(true);
  } else if (botTokenSet && !pollingEnabled) {
    // sendMessage ishlashi uchun bot instance yaratiladi, lekin polling yoqilmaydi
    getBot(false);
    console.log('ℹ️ BOT_POLLING_ENABLED=false — bot polling yoqilmadi (xabar yuborish ishlaydi)');
  } else {
    console.log('⚠️  TELEGRAM_BOT_TOKEN topilmadi — bot ishga tushmadi');
  }

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server http://localhost:${PORT} da ishlamoqda`);
  });
}

start().catch((err) => {
  console.error("❌ Server start xatosi:", err.message);
  process.exit(1);
});

module.exports = app;
