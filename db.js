const { Pool } = require("pg");

let pool;
<<<<<<< HEAD
let _tablesReady = null;
=======
let _tablesReady = null; // Lazy init promise — bir marta ishga tushadi
>>>>>>> 83642868c3da3a35e2a0e0a4cf296ed3de904c8a

function getPool() {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL .env da topilmadi");
<<<<<<< HEAD
    pool = new Pool({
      connectionString: url,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 5,
=======

    pool = new Pool({
      connectionString: url,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
      max: 5, // serverless uchun kam connection
>>>>>>> 83642868c3da3a35e2a0e0a4cf296ed3de904c8a
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

<<<<<<< HEAD
function ensureTables() {
  if (!_tablesReady) {
    _tablesReady = initTables(getPool()).catch((err) => {
      _tablesReady = null;
=======
// Jadvallar faqat bir marta yaratiladi (lazy)
function ensureTables() {
  if (!_tablesReady) {
    _tablesReady = initTables(getPool()).catch((err) => {
      _tablesReady = null; // xato bo'lsa keyingi so'rovda qayta urinilsin
>>>>>>> 83642868c3da3a35e2a0e0a4cf296ed3de904c8a
      throw err;
    });
  }
  return _tablesReady;
}

<<<<<<< HEAD
=======
// server.js startup uchun
>>>>>>> 83642868c3da3a35e2a0e0a4cf296ed3de904c8a
async function connect() {
  await ensureTables();
  return getPool();
}

<<<<<<< HEAD
=======
// Barcha model so'rovlari shu orqali o'tadi (jadvallar avtomatik tayyor bo'ladi)
>>>>>>> 83642868c3da3a35e2a0e0a4cf296ed3de904c8a
async function query(text, params) {
  await ensureTables();
  return getPool().query(text, params);
}

<<<<<<< HEAD
=======
// ── SQL jadvallarni yaratish (agar mavjud bo'lmasa) ───────────────
>>>>>>> 83642868c3da3a35e2a0e0a4cf296ed3de904c8a
async function initTables(p) {
  await p.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS users (
      id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
<<<<<<< HEAD
      public_id   VARCHAR(10),
=======
      public_id  VARCHAR(10),
>>>>>>> 83642868c3da3a35e2a0e0a4cf296ed3de904c8a
      name        VARCHAR(255) NOT NULL,
      phone       VARCHAR(50)  NOT NULL UNIQUE,
      telegram    VARCHAR(255) DEFAULT '',
      avatar      TEXT,
      is_blocked  BOOLEAN      NOT NULL DEFAULT FALSE,
<<<<<<< HEAD
      is_operator BOOLEAN      NOT NULL DEFAULT FALSE,
=======
>>>>>>> 83642868c3da3a35e2a0e0a4cf296ed3de904c8a
      balance     NUMERIC      NOT NULL DEFAULT 0,
      joined      TIMESTAMPTZ  DEFAULT NOW(),
      created_at  TIMESTAMPTZ  DEFAULT NOW(),
      updated_at  TIMESTAMPTZ  DEFAULT NOW()
    );

<<<<<<< HEAD
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='balance') THEN
        ALTER TABLE users ADD COLUMN balance NUMERIC NOT NULL DEFAULT 0; END IF; END $$;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_blocked') THEN
        ALTER TABLE users ADD COLUMN is_blocked BOOLEAN NOT NULL DEFAULT FALSE; END IF; END $$;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_operator') THEN
        ALTER TABLE users ADD COLUMN is_operator BOOLEAN NOT NULL DEFAULT FALSE; END IF; END $$;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='public_id') THEN
        ALTER TABLE users ADD COLUMN public_id VARCHAR(10); END IF; END $$;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='tg_chat_id') THEN
        ALTER TABLE users ADD COLUMN tg_chat_id BIGINT; END IF; END $$;

    CREATE TABLE IF NOT EXISTS products (
      id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      public_id   VARCHAR(10),
=======
    -- Mavjud jadvalga balance ustunini qo'shish (agar yo'q bo'lsa)
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'balance'
      ) THEN
        ALTER TABLE users ADD COLUMN balance NUMERIC NOT NULL DEFAULT 0;
      END IF;
    END $$;

    -- Mavjud jadvalga is_blocked ustunini qo'shish (agar yo'q bo'lsa)
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'is_blocked'
      ) THEN
        ALTER TABLE users ADD COLUMN is_blocked BOOLEAN NOT NULL DEFAULT FALSE;
      END IF;
    END $$;

    -- Mavjud jadvalga public_id ustunini qo'shish (agar yo'q bo'lsa)
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'public_id'
      ) THEN
        ALTER TABLE users ADD COLUMN public_id VARCHAR(10);
      END IF;
    END $$;

    -- Mavjud jadvalga tg_chat_id ustunini qo'shish (agar yo'q bo'lsa)
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'tg_chat_id'
      ) THEN
        ALTER TABLE users ADD COLUMN tg_chat_id BIGINT;
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS products (
      id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      public_id  VARCHAR(10),
>>>>>>> 83642868c3da3a35e2a0e0a4cf296ed3de904c8a
      name        VARCHAR(255) NOT NULL,
      category    VARCHAR(50)  NOT NULL DEFAULT 'boshqa',
      price       NUMERIC      NOT NULL,
      unit        VARCHAR(50)  NOT NULL DEFAULT 'dona',
      qty         INTEGER      NOT NULL,
      condition   VARCHAR(50)  DEFAULT 'Yaxshi',
      viloyat     VARCHAR(255) NOT NULL,
      tuman       VARCHAR(255) DEFAULT '',
<<<<<<< HEAD
      mahalla     VARCHAR(255) DEFAULT '',
      photo       TEXT,
      photos      TEXT,
      owner_id    UUID         NOT NULL REFERENCES users(id),
      is_active   BOOLEAN      DEFAULT TRUE,
      status      VARCHAR(20)  NOT NULL DEFAULT 'pending',
      reject_reason TEXT       DEFAULT NULL,
=======
      photo       TEXT,
      owner_id    UUID         NOT NULL REFERENCES users(id),
      is_active   BOOLEAN      DEFAULT TRUE,
>>>>>>> 83642868c3da3a35e2a0e0a4cf296ed3de904c8a
      created_at  TIMESTAMPTZ  DEFAULT NOW(),
      updated_at  TIMESTAMPTZ  DEFAULT NOW()
    );

<<<<<<< HEAD
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='public_id') THEN
        ALTER TABLE products ADD COLUMN public_id VARCHAR(10); END IF; END $$;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='photos') THEN
        ALTER TABLE products ADD COLUMN photos TEXT; END IF; END $$;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='mahalla') THEN
        ALTER TABLE products ADD COLUMN mahalla VARCHAR(255) DEFAULT ''; END IF; END $$;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='status') THEN
        ALTER TABLE products ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'approved'; END IF; END $$;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='reject_reason') THEN
        ALTER TABLE products ADD COLUMN reject_reason TEXT DEFAULT NULL; END IF; END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS users_public_id_unique ON users(public_id) WHERE public_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS products_public_id_unique ON products(public_id) WHERE public_id IS NOT NULL;

    DO $$
    DECLARE r RECORD; sid TEXT;
=======
    -- products uchun public_id ustunini qo'shish (agar kerak bo'lsa)
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'public_id'
      ) THEN
        ALTER TABLE products ADD COLUMN public_id VARCHAR(10);
      END IF;
    END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS users_public_id_unique
      ON users(public_id)
      WHERE public_id IS NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS products_public_id_unique
      ON products(public_id)
      WHERE public_id IS NOT NULL;

    -- Eski yozuvlar uchun public_id'ni backfill qilish
    DO $$
    DECLARE r RECORD;
      sid TEXT;
>>>>>>> 83642868c3da3a35e2a0e0a4cf296ed3de904c8a
    BEGIN
      FOR r IN SELECT id FROM users WHERE public_id IS NULL LOOP
        LOOP
          sid := 'US' || lpad(floor(random() * 100000000)::text, 8, '0');
          EXIT WHEN NOT EXISTS (SELECT 1 FROM users WHERE public_id = sid);
        END LOOP;
        UPDATE users SET public_id = sid WHERE id = r.id;
      END LOOP;
    END $$;

    DO $$
<<<<<<< HEAD
    DECLARE r RECORD; sid TEXT;
=======
    DECLARE r RECORD;
      sid TEXT;
>>>>>>> 83642868c3da3a35e2a0e0a4cf296ed3de904c8a
    BEGIN
      FOR r IN SELECT id FROM products WHERE public_id IS NULL LOOP
        LOOP
          sid := 'PO' || lpad(floor(random() * 100000000)::text, 8, '0');
          EXIT WHEN NOT EXISTS (SELECT 1 FROM products WHERE public_id = sid);
        END LOOP;
        UPDATE products SET public_id = sid WHERE id = r.id;
      END LOOP;
    END $$;

    CREATE TABLE IF NOT EXISTS offers (
      id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      product_id  UUID        NOT NULL REFERENCES products(id),
      buyer_id    UUID        NOT NULL REFERENCES users(id),
      seller_id   UUID        NOT NULL REFERENCES users(id),
      status      VARCHAR(50) DEFAULT 'pending',
      message     TEXT        DEFAULT '',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      offer_id     UUID        NOT NULL UNIQUE REFERENCES offers(id),
      buyer_id     UUID        NOT NULL REFERENCES users(id),
      seller_id    UUID        NOT NULL REFERENCES users(id),
      product_id   UUID        NOT NULL REFERENCES products(id),
      amount       NUMERIC     NOT NULL,
      status       VARCHAR(50) DEFAULT 'pending',
      card_from    VARCHAR(50),
      card_to      VARCHAR(50) NOT NULL,
      note         TEXT,
      confirmed_at TIMESTAMPTZ,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    );

<<<<<<< HEAD
    CREATE INDEX IF NOT EXISTS idx_products_active_created ON products (is_active, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_products_status ON products (status);
=======
    -- Mavjud jadvalga photos ustunini qo'shish (agar yo'q bo'lsa)
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'photos'
      ) THEN
        ALTER TABLE products ADD COLUMN photos TEXT;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_products_active_created ON products (is_active, created_at DESC);
>>>>>>> 83642868c3da3a35e2a0e0a4cf296ed3de904c8a
    CREATE INDEX IF NOT EXISTS idx_products_owner ON products (owner_id);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
    CREATE INDEX IF NOT EXISTS idx_offers_buyer ON offers (buyer_id);
    CREATE INDEX IF NOT EXISTS idx_offers_seller ON offers (seller_id);
  `);
}

<<<<<<< HEAD
module.exports = { connect, query };
=======
module.exports = { connect, query };
>>>>>>> 83642868c3da3a35e2a0e0a4cf296ed3de904c8a
