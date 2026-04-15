const { Telegraf } = require('telegraf');
const User = require('./models/User');
const { createToken } = require('./tgTokens');
const { query } = require('./db');

const MINI_APP_URL = process.env.MINI_APP_URL || 'https://frontend-353d.vercel.app/';

let bot = null;
let pollingStarted = false;

// Operator phones/telegrams
const OPERATOR_PHONES    = ["331350206"];
const OPERATOR_TELEGRAMS = ["@Requrilish_admin", "@requrilish_admin"];

function phoneCore(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.slice(-9);
}

function isOperatorUser(user) {
  if (!user) return false;
  const core = phoneCore(user.phone);
  if (OPERATOR_PHONES.includes(core)) return true;
  const tg = (user.telegram || "").toLowerCase();
  if (OPERATOR_TELEGRAMS.map(t => t.toLowerCase()).includes(tg)) return true;
  return user.is_operator === true;
}

// Pending reply state for operators (waiting for reject reason)
const pendingRejectReason = new Map(); // chatId -> productId

function getBot(startPolling = false) {
  if (!bot && process.env.TELEGRAM_BOT_TOKEN) {
    bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

    // /start command
    bot.command('start', async (ctx) => {
      const tgChatId = ctx.from.id;
      const firstName = ctx.from.first_name || '';

      try {
        const existingUser = await User.findByTgChatId(tgChatId);
        if (existingUser) {
          const token = createToken(existingUser.id);
          const appUrl = `${MINI_APP_URL}?tgToken=${token}`;
          return ctx.reply(
            `Salom, ${firstName}! ✅ Xush kelibsiz!\n\nQuyidagi tugmani bosib kiring:`,
            {
              reply_markup: {
                inline_keyboard: [[
                  { text: '🚀 Mini Appga kirish', web_app: { url: appUrl } },
                ]],
              },
            }
          );
        }
      } catch { /* DB xatosida oddiy xush kelibsizga o'tadi */ }

      ctx.reply(
        `Salom! 👋 ReMarket'ga xush kelibsiz!\n\nKirish uchun telefon raqamingizni yuboring:`,
        {
          reply_markup: {
            keyboard: [[
              { text: '📱 Telefon raqamni yuborish', request_contact: true },
            ]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        }
      );
    });

    // Contact handler — ALWAYS update tg_chat_id + send login link
    bot.on('contact', async (ctx) => {
      const firstName = ctx.from.first_name || '';
      const tgChatId = ctx.from.id;
      const rawPhone = ctx.message.contact.phone_number.replace(/\D/g, '');
      const phone = rawPhone.startsWith('998') ? rawPhone.slice(3) : rawPhone;
      const tgUsername = ctx.from.username ? `@${ctx.from.username}` : '';

      try {
        let user = await User.findOne({ phone });
        let isNew = false;
        let appUrl;

        if (user) {
          // Existing user — ALWAYS update tg_chat_id
          if (String(user.tg_chat_id) !== String(tgChatId)) {
            user = await User.findByIdAndUpdate(user.id, { tg_chat_id: tgChatId }) || user;
          }
          // ALWAYS generate token and send login link
          const token = createToken(user.id);
          appUrl = `${MINI_APP_URL}?tgToken=${token}`;
        } else {
          // New user — register with tg_chat_id
          isNew = true;
          const params = new URLSearchParams({
            phone,
            tgChatId: String(tgChatId),
            name: firstName,
            telegram: tgUsername,
            register: '1',
          });
          appUrl = `${MINI_APP_URL}?${params.toString()}`;
        }

        await ctx.reply("✅ Raqam qabul qilindi", {
          reply_markup: { remove_keyboard: true },
        });

        await ctx.reply(
          isNew
            ? `Salom, ${firstName}! 👋\n\nSiz yangi foydalanuvchisiz.\nQuyidagi tugmani bosing:`
            : `Salom, ${firstName}! ✅\n\nQuyidagi tugmani bosib kiring:`,
          {
            reply_markup: {
              inline_keyboard: [[
                { text: '🚀 Mini Appga kirish', web_app: { url: appUrl } },
              ]],
            },
          }
        );
      } catch (e) {
        console.error('Bot contact handler xatosi:', e.message);
        ctx.reply('Xatolik yuz berdi. Qayta urinib ko\'ring yoki /start bosing.');
      }
    });

    // Operator: approve product
    bot.action(/^approve_(.+)$/, async (ctx) => {
      const productId = ctx.match[1];
      try {
        const tgChatId = ctx.from.id;
        const opUser = await User.findByTgChatId(tgChatId);
        if (!opUser || !isOperatorUser(opUser)) {
          return ctx.answerCbQuery('Ruxsat yo\'q');
        }

        const { rows } = await query(
          `UPDATE products SET status='approved', is_active=true, updated_at=NOW()
           WHERE id=$1 RETURNING *, owner_id`,
          [productId]
        );
        const product = rows[0];
        if (!product) return ctx.answerCbQuery('Mahsulot topilmadi');

        // Notify owner
        const owner = await User.findById(product.owner_id);
        if (owner?.tg_chat_id) {
          await notifyUser(
            owner.tg_chat_id,
            `✅ *Postingiz tasdiqlandi!*\n\n🧱 *${product.name}*\n💰 ${Number(product.price).toLocaleString()} so'm\n\nPost e'lon qilindi va barchaga ko'rinmoqda!`,
            { parse_mode: 'Markdown' }
          );
        }

        await ctx.editMessageText(
          ctx.callbackQuery.message.text + '\n\n✅ TASDIQLANDI',
          { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [] } }
        );
        await ctx.answerCbQuery('Tasdiqlandi ✅');
      } catch (e) {
        console.error('approve action error:', e.message);
        await ctx.answerCbQuery('Xatolik: ' + e.message);
      }
    });

    // Operator: reject product — ask for reason
    bot.action(/^reject_(.+)$/, async (ctx) => {
      const productId = ctx.match[1];
      try {
        const tgChatId = ctx.from.id;
        const opUser = await User.findByTgChatId(tgChatId);
        if (!opUser || !isOperatorUser(opUser)) {
          return ctx.answerCbQuery('Ruxsat yo\'q');
        }

        pendingRejectReason.set(String(tgChatId), productId);

        await ctx.reply(`❌ Rad etish sababi ni kiriting:\n(Product: ${productId.slice(0,8)}...)`);
        await ctx.answerCbQuery('Sabab kiriting');
      } catch (e) {
        console.error('reject action error:', e.message);
        await ctx.answerCbQuery('Xatolik');
      }
    });

    // Handle reject reason text from operator
    bot.on('text', async (ctx) => {
      const tgChatId = String(ctx.from.id);
      const productId = pendingRejectReason.get(tgChatId);

      if (!productId) return; // Not waiting for a reason

      const reason = ctx.message.text.trim();
      pendingRejectReason.delete(tgChatId);

      try {
        const { rows } = await query(
          `UPDATE products SET status='rejected', is_active=false, reject_reason=$1, updated_at=NOW()
           WHERE id=$2 RETURNING *, owner_id`,
          [reason, productId]
        );
        const product = rows[0];
        if (!product) {
          return ctx.reply('Mahsulot topilmadi');
        }

        // Notify owner
        const owner = await User.findById(product.owner_id);
        if (owner?.tg_chat_id) {
          await notifyUser(
            owner.tg_chat_id,
            `❌ *Postingiz rad etildi*\n\n🧱 *${product.name}*\n\n📋 *Sabab:* ${reason}\n\nQayta urinib ko'ring yoki boshqa post qo'shing.`,
            { parse_mode: 'Markdown' }
          );
        }

        await ctx.reply(`✅ Rad etildi. Sabab: ${reason}`);
      } catch (e) {
        console.error('reject reason handler error:', e.message);
        ctx.reply('Xatolik: ' + e.message);
      }
    });
  }

  if (bot && startPolling && !pollingStarted) {
    pollingStarted = true;
    bot.launch({ dropPendingUpdates: true })
      .then(() => console.log('🤖 Telegram bot polling ishga tushdi'))
      .catch(err => {
        const msg = String(err?.message || "");
        if (msg.includes("409")) {
          console.warn("⚠️ Bot 409: boshqa instance polling qilmoqda");
          return;
        }
        console.error('❌ Bot launch xatosi:', msg);
      });
  }
  return bot;
}

async function notifyUser(tgChatId, text, extra = {}) {
  const b = getBot(false);
  if (!b || !tgChatId) return;
  try {
    await b.telegram.sendMessage(tgChatId, text, extra);
  } catch (e) {
    console.error('Bot xabar yuborishda xato:', e.message);
  }
}

// Send product to all operators for approval
async function notifyOperatorsNewProduct(product, ownerName) {
  const b = getBot(false);
  if (!b) return;

  try {
    // Get all operators
    const { rows: operators } = await query(
      `SELECT tg_chat_id FROM users WHERE is_operator = true AND tg_chat_id IS NOT NULL`
    );

    // Also check by phone/telegram
    const { rows: byPhone } = await query(
      `SELECT tg_chat_id FROM users WHERE (phone = ANY($1) OR telegram = ANY($2)) AND tg_chat_id IS NOT NULL`,
      [["331350206"], ["@Requrilish_admin", "@requrilish_admin"]]
    );

    const allOps = [...operators, ...byPhone];
    const chatIds = [...new Set(allOps.map(o => o.tg_chat_id).filter(Boolean))];

    const msg =
      `🆕 *Yangi post tekshiruvda!*\n\n` +
      `👤 Egasi: *${ownerName}*\n` +
      `🧱 Nomi: *${product.name}*\n` +
      `💰 Narxi: *${Number(product.price).toLocaleString()} so'm/${product.unit}*\n` +
      `📍 Joylashuv: *${product.viloyat}${product.tuman ? ` › ${product.tuman}` : ''}${product.mahalla ? ` › ${product.mahalla}` : ''}*\n` +
      `🏷 Toifa: *${product.category}*\n` +
      `📦 Miqdor: *${product.qty} ${product.unit}*\n` +
      `🆔 ID: \`${product.id}\``;

    const keyboard = {
      inline_keyboard: [[
        { text: '✅ Tasdiqlash', callback_data: `approve_${product.id}` },
        { text: '❌ Rad etish', callback_data: `reject_${product.id}` },
      ]],
    };

    for (const chatId of chatIds) {
      try {
        await b.telegram.sendMessage(chatId, msg, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      } catch (e) {
        console.error(`Operator ${chatId} ga xabar yuborishda xato:`, e.message);
      }
    }
  } catch (e) {
    console.error('notifyOperatorsNewProduct xatosi:', e.message);
  }
}

module.exports = { getBot, notifyUser, notifyOperatorsNewProduct };