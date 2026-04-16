const { query } = require("../../../db");

const TABLE = "requrilish_posts";

async function createPost(data) {
  const { rows } = await query(
    `INSERT INTO ${TABLE}
      (title, description, price, unit, qty, category, location, photos, owner_id, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending_approval')
     RETURNING *`,
    [
      data.title,
      data.description || "",
      data.price,
      data.unit || "dona",
      data.qty || 1,
      data.category || "boshqa",
      data.location || "",
      JSON.stringify(data.photos || []),
      data.owner_id || null,
    ]
  );
  return rows[0];
}

async function getVisiblePosts() {
  const { rows } = await query(
    `SELECT p.*, u.name AS owner_name, u.phone AS owner_phone, u.telegram AS owner_telegram
     FROM ${TABLE} p
     LEFT JOIN users u ON u.id = p.owner_id
     WHERE p.status IN ('active','pending_approval','pending_payment')
     ORDER BY p.created_at DESC`
  );
  return rows;
}

async function getById(id) {
  const { rows } = await query(
    `SELECT p.*, u.name AS owner_name, u.phone AS owner_phone, u.telegram AS owner_telegram
     FROM ${TABLE} p
     LEFT JOIN users u ON u.id = p.owner_id
     WHERE p.id=$1 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function getByUser(userId) {
  const { rows } = await query(
    `SELECT p.*, u.name AS owner_name, u.phone AS owner_phone, u.telegram AS owner_telegram
     FROM ${TABLE} p
     LEFT JOIN users u ON u.id = p.owner_id
     WHERE p.owner_id=$1 AND p.status != 'deleted'
     ORDER BY p.created_at DESC`,
    [userId]
  );
  return rows;
}

async function updateStatus(id, status, rejectReason = null) {
  const { rows } = await query(
    `UPDATE ${TABLE}
     SET status=$1, reject_reason=$2, updated_at=NOW()
     WHERE id=$3
     RETURNING *`,
    [status, rejectReason, id]
  );
  return rows[0] || null;
}

async function nullOwnerForUser(userId) {
  await query(`UPDATE ${TABLE} SET owner_id=NULL, updated_at=NOW() WHERE owner_id=$1`, [userId]);
}

module.exports = {
  createPost,
  getVisiblePosts,
  getById,
  getByUser,
  updateStatus,
  nullOwnerForUser,
};

