const { Pool } = require("pg");

// Database URL ni olish
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL topilmadi!");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function deleteUsers() {
  const userIds = [
    '11a4dfbc-66fd-412b-987a-9a57eabd0c02',
    '1d806d06-4d32-4baf-837a-b30584efad15',
    '244f4340-dde6-4e73-97da-2c9fc65c9adc',
    '27aff7a4-573a-43f0-9b9e-79fe270d3018',
    '2df1d7b3-0fda-423d-8431-53be22ccda47',
    '355907bc-b83f-49d8-9d50-217244a38ce6',
    '3a4a5c12-eb0f-4e82-a605-ebf08486eccd',
    '3ae61f69-7466-439a-a351-a0b60b109e45',
    '4204d593-4015-4f8f-b359-ee101e4547f4',
    '4dd260d3-2ad4-4a8a-9aae-7962632a9ef4',
    '5089ca65-dd1d-4ed9-84f5-e3ec04a1257d',
    '52d0b97d-cd82-4fc2-a877-162790947c05',
    '5fe37b55-582c-4fd0-825e-96ac29f199cb',
    '6281f2e5-08e7-4efc-9f6e-27c4fe404585',
    '6b5714fb-0d18-4edb-94fb-5833e33edc5a',
    '6cd24a08-fbc2-4fde-892f-e2139b4b00a8',
    '6ecda8e8-67e5-40ae-b5fe-22553f37324e',
    '74ed0abe-02a7-4bb3-ae9a-637200929b34',
    '78476472-9e16-4be3-832f-e9c968498206',
    '7a54215d-347a-467f-9532-4dbf0f33703a',
    '7ec02c37-4271-48f9-8833-86a5260b82e6',
    '8337f3d1-f334-4eb4-b37c-2dcd05bb3bf7',
    '86ccfb41-a197-4322-920b-f1fc09c15b89',
    '8d7b2e38-409e-439e-a9ea-bf7487e7d3e8',
    '91ebfbe6-c358-4e33-81bf-d7ce80dcba7c',
    '933da586-77f8-48a3-90ae-441592c64c03',
    '9c709ef6-d518-48b4-8e03-d92898076001',
    'a24df0ac-9e27-41e0-9215-be319fc7a174',
    'a5c27f55-4b81-4a3e-a116-b85e9b51358c',
    'a98e4268-4423-41a6-9e14-9b3ea71a3c36',
    'b6b58f20-2b18-44fb-bf8d-eb964e6f8ed0',
    'bff28626-25d4-4484-95e2-c6280e712d4a',
    'c8b17aa2-5dd0-49cf-97f2-c48ffa755011',
    'c9116d2d-1c36-4dc5-a291-0b75f8496ce3',
    'cf4913f3-f298-4bda-9490-eb72da7633d0',
    'daf9a2c6-0b28-4601-bacc-9769f040dc2b',
    'db844a8c-6b88-4a43-928e-9046fd60fb37',
    'e342a3ad-39db-4665-ae84-c1d53d53379a',
    'e80cfe7c-f907-4843-81f1-fc01b2901607',
    'ea6f9c72-19d6-4d63-a550-0b49e2b52b0c',
    'ed00bd50-1d0f-4cdc-98fb-261040cb73f2',
    'f1c2e9a9-7649-460f-993b-fd88472e971d',
    'f892c4e3-f959-40ba-a8f9-822e55f840c5',
    'f92c7c65-db42-4800-8e65-02af59a899cf'
  ];

  try {
    console.log("🗑️ User larni o'chirish boshlanmoqda...");

    // Avval offers table dan o'chirish
    console.log("📋 Offers table dan o'chirish...");
    const offersResult = await pool.query(
      `DELETE FROM offers WHERE buyer_id = ANY($1)`,
      [userIds]
    );
    console.log(`✅ ${offersResult.rowCount} ta offer o'chirildi`);

    // Keyin products table dan o'chirish
    console.log("📦 Products table dan o'chirish...");
    const productsResult = await pool.query(
      `DELETE FROM products WHERE owner_id = ANY($1)`,
      [userIds]
    );
    console.log(`✅ ${productsResult.rowCount} ta product o'chirildi`);

    // Keyin payments table dan o'chirish
    console.log("💳 Payments table dan o'chirish...");
    const paymentsResult = await pool.query(
      `DELETE FROM payments WHERE buyer_id = ANY($1) OR seller_id = ANY($1)`,
      [userIds]
    );
    console.log(`✅ ${paymentsResult.rowCount} ta payment o'chirildi`);

    // Nihoyat users table dan o'chirish
    console.log("👥 Users table dan o'chirish...");
    const usersResult = await pool.query(
      `DELETE FROM users WHERE id = ANY($1)`,
      [userIds]
    );
    console.log(`✅ ${usersResult.rowCount} ta user o'chirildi`);

    console.log("🎉 Barcha user lar muvaffaqiyatli o'chirildi!");

  } catch (error) {
    console.error("❌ Xatolik:", error.message);
  } finally {
    await pool.end();
  }
}

deleteUsers();
