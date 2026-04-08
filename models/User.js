const { query } = require("../db");
const crypto = require("crypto");

const User = {
  async _generatePublicId() {
    for (let attempt = 0; attempt < 10; attempt++) {
      const n = crypto.randomInt(0, 100000000); // 0..99999999
      const pid = "US" + String(n).padStart(8, "0");
      const { rows } = await query("SELECT 1 FROM users WHERE public_id=$1 LIMIT 1", [pid]);
      if (rows.length === 0) return pid;
    }
    throw new Error("public_id generatsiya qilishda xatolik");
  },

  async findOne({ phone }) {
    const { rows } = await query(
      "SELECT * FROM users WHERE phone = $1 LIMIT 1",
      [phone]
    );
    return rows[0] || null;
  },

  async findByTgChatId(tgChatId) {
    const { rows } = await query(
      "SELECT * FROM users WHERE tg_chat_id = $1 LIMIT 1",
      [tgChatId]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await query(
      "SELECT * FROM users WHERE id = $1 LIMIT 1",
      [id]
    );
    return rows[0] || null;
  },

  async create({ name, phone, telegram = "" }) {
    const public_id = await this._generatePublicId();
    const { rows } = await query(
      `INSERT INTO users (public_id, name, phone, telegram)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [public_id, name, phone, telegram]
    );
    return rows[0];
  },

  // Balansga pul qo'shish (deposit)
  async deposit(id, amount) {
    if (amount <= 0) throw new Error("Summa musbat bo'lishi kerak");
    const { rows } = await query(
      `UPDATE users
       SET balance = balance + $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [amount, id]
    );
    return rows[0] || null;
  },

  // Balansdan pul ayirish (pay) — yetarli mablag' tekshiruvi bilan
  async deduct(id, amount) {
    if (amount <= 0) throw new Error("Summa musbat bo'lishi kerak");
    const { rows } = await query(
      `UPDATE users
       SET balance = balance - $1, updated_at = NOW()
       WHERE id = $2 AND balance >= $1
       RETURNING *`,
      [amount, id]
    );
    if (!rows[0]) throw new Error("Balansda yetarli mablag' yo'q");
    return rows[0];
  },

  async findByIdAndUpdate(id, update) {
    const fields = [];
    const values = [];
    let i = 1;

    if (update.name !== undefined)       { fields.push(`name = $${i++}`);        values.push(update.name); }
    if (update.phone !== undefined)      { fields.push(`phone = $${i++}`);       values.push(update.phone); }
    if (update.telegram !== undefined)   { fields.push(`telegram = $${i++}`);    values.push(update.telegram); }
    if (update.avatar !== undefined)     { fields.push(`avatar = $${i++}`);      values.push(update.avatar); }
    if (update.tg_chat_id !== undefined) { fields.push(`tg_chat_id = $${i++}`);  values.push(update.tg_chat_id); }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    return rows[0] || null;
  },
};

module.exports = User;
