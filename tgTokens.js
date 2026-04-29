// Telegram login tokenlari — JWT asosida (server restart'dan keyin ham ishlaydi)
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'remarket_secret_key_2024';
const TTL_SEC = 60 * 60; // 1 soat

function createToken(userId) {
  return jwt.sign({ userId, type: 'tg_login' }, SECRET, { expiresIn: TTL_SEC });
}

function verifyToken(token) {
  try {
    const data = jwt.verify(token, SECRET);
    if (data.type !== 'tg_login') return null;
    return { userId: data.userId };
  } catch {
    return null;
  }
}

module.exports = { createToken, verifyToken };
