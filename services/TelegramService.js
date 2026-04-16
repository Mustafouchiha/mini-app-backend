const bot = require('../bot');

class TelegramService {
  constructor() {
    this.MINI_APP_URL = process.env.MINI_APP_URL || 'https://your-app.vercel.app';
  }

  async sendWelcomeMessage(chatId, user, token) {
    const message = `Xush kelibsiz, ${user.name}! ✅`;
    
    const keyboard = {
      reply_markup: {
        inline_keyboard: [[
          {
            text: "🚀 ReQurilish — kirish",
            web_app: { url: `${this.MINI_APP_URL}?token=${token}` }
          }
        ]]
      }
    };

    try {
      await bot.telegram.sendMessage(chatId, message, keyboard);
    } catch (error) {
      console.error('Welcome message error:', error);
    }
  }

  async requestPhone(chatId) {
    const keyboard = {
      reply_markup: {
        keyboard: [[
          { text: "📱 Telefon yuborish", request_contact: true }
        ]],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    };

    const message = 'ReQurilish botiga xush kelibsiz! 🏗️\n\n' +
      'Telefon raqamingizni yuboring:';

    try {
      await bot.telegram.sendMessage(chatId, message, keyboard);
    } catch (error) {
      console.error('Phone request error:', error);
    }
  }

  async notifyNewPost(post, owner) {
    const operators = await this.getOperators();
    
    const message = `🆕 Yangi post tekshiruvda!\n\n` +
      `📦 Nomi: ${post.name}\n` +
      `💰 Narxi: ${post.price} so'm\n` +
      `📊 Miqdori: ${post.qty} ${post.unit}\n` +
      `📍 Joylashuv: ${post.viloyat}${post.tuman ? ', ' + post.tuman : ''}${post.mahalla ? ', ' + post.mahalla : ''}\n` +
      `👤 Egasi: ${owner.name}\n` +
      `📞 Telefon: ${owner.phone}`;

    const keyboard = {
      reply_markup: {
        inline_keyboard: [[
          {
            text: '✅ Tasdiqlash',
            callback_data: `approve_${post.id}`
          },
          {
            text: '❌ Rad etish',
            callback_data: `reject_${post.id}`
          }
        ]]
      }
    };

    for (const operator of operators) {
      if (operator.tg_chat_id) {
        try {
          await bot.telegram.sendMessage(operator.tg_chat_id, message, keyboard);
        } catch (error) {
          console.error(`Error notifying operator ${operator.id}:`, error);
        }
      }
    }
  }

  async notifyPostApproved(post, owner) {
    if (!owner.tg_chat_id) return;

    const message = `✅ Postingiz tasdiqlandi va e'lon qilindi!\n\n` +
      `📦 Mahsulot: ${post.name}\n` +
      `💰 Narx: ${post.price} so'm\n\n` +
      `Endi barcha foydalanuvchilarga ko'rinadi!`;

    try {
      await bot.telegram.sendMessage(owner.tg_chat_id, message);
    } catch (error) {
      console.error('Approval notification error:', error);
    }
  }

  async notifyPostRejected(post, owner, reason) {
    if (!owner.tg_chat_id) return;

    const message = `❌ Postingiz rad etildi\n\n` +
      `📦 Mahsulot: ${post.name}\n` +
      `💰 Narx: ${post.price} so'm\n\n` +
      `Sabab: ${reason || 'Operator tomonidan rad etilgan'}`;

    try {
      await bot.telegram.sendMessage(owner.tg_chat_id, message);
    } catch (error) {
      console.error('Rejection notification error:', error);
    }
  }

  async notifyOfferReceived(offer, product, buyer, seller) {
    if (!seller.tg_chat_id) return;

    const message = `📦 Yangi taklif keldi!\n\n` +
      `👤 Xaridor: ${buyer.name}\n` +
      `🧱 Mahsulot: ${product.name}\n` +
      `💰 Narx: ${Number(product.price).toLocaleString()} so'm\n` +
      `${offer.message ? `💬 Xabar: ${offer.message}\n` : ''}` +
      `\nReMarket'da ko'rish →`;

    const keyboard = {
      reply_markup: {
        inline_keyboard: [[{
          text: '📋 Taklifni ko\'rish',
          web_app: { url: `${this.MINI_APP_URL}` }
        }]]
      }
    };

    try {
      await bot.telegram.sendMessage(seller.tg_chat_id, message, keyboard);
    } catch (error) {
      console.error('Offer notification error:', error);
    }
  }

  async notifyPaymentCompleted(offer, buyer, seller) {
    // Notify buyer
    if (buyer.tg_chat_id) {
      const buyerMessage = `✅ To'lov tasdiqlandi!\n\nSotuvchi kontaktingiz:\n` +
        `📞 Telefon: ${seller.phone}\n` +
        `✈️ Telegram: ${seller.telegram}\n` +
        `👤 Ism: ${seller.name}\n`;

      try {
        await bot.telegram.sendMessage(buyer.tg_chat_id, buyerMessage);
      } catch (error) {
        console.error('Buyer payment notification error:', error);
      }
    }

    // Notify seller
    if (seller.tg_chat_id) {
      const sellerMessage = `💰 To'lov qabul qilindi!\n\n` +
        `👤 Xaridor: ${buyer.name}\n` +
        `💰 Mahsulot narxi: ${offer.product_price} so'm\n` +
        `📞 Telefon: ${buyer.phone}`;

      try {
        await bot.telegram.sendMessage(seller.tg_chat_id, sellerMessage);
      } catch (error) {
        console.error('Seller payment notification error:', error);
      }
    }
  }

  async getOperators() {
    // Database implementation would go here
    // For now, return empty array
    return [];
  }

  async openPostView(chatId, postId) {
    const keyboard = {
      reply_markup: {
        inline_keyboard: [[{
          text: '📋 Postni ko\'rish',
          web_app: { url: `${this.MINI_APP_URL}?postId=${postId}` }
        }]]
      }
    };

    try {
      await bot.telegram.sendMessage(chatId, 'Postni ko\'rish uchun tugmani bosing:', keyboard);
    } catch (error) {
      console.error('Post view error:', error);
    }
  }
}

module.exports = new TelegramService();
