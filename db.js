const { Pool } = require("pg");

let pool;
let _tablesReady = null; // Lazy init promise — bir marta ishga tushadi

function getPool() {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL .env da topilmadi");

    pool = new Pool({
      connectionString: url,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
      max: 5, // serverless uchun kam connection
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

// Jadvallar faqat bir marta yaratiladi (lazy)
function ensureTables() {
  if (!_tablesReady) {
    _tablesReady = initTables(getPool()).catch((err) => {
      _tablesReady = null; // xato bo'lsa keyingi so'rovda qayta urinilsin
      throw err;
    });
  }
  return _tablesReady;
}

// server.js startup uchun
async function connect() {
  await ensureTables();
  return getPool();
}

// Barcha model so'rovlari shu orqali o'tadi (jadvallar avtomatik tayyor bo'ladi)
async function query(text, params) {
  await ensureTables();
  return getPool().query(text, params);
}

// ── SQL jadvallarni yaratish (agar mavjud bo'lmasa) ───────────────
async function initTables(p) {
  await p.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS users (
      id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      public_id  VARCHAR(10),
      name        VARCHAR(255) NOT NULL,
      phone       VARCHAR(50)  NOT NULL UNIQUE,
      telegram    VARCHAR(255) DEFAULT '',
      avatar      TEXT,
      is_blocked  BOOLEAN      NOT NULL DEFAULT FALSE,
      balance     NUMERIC      NOT NULL DEFAULT 0,
      joined      TIMESTAMPTZ  DEFAULT NOW(),
      created_at  TIMESTAMPTZ  DEFAULT NOW(),
      updated_at  TIMESTAMPTZ  DEFAULT NOW()
    );

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
      name        VARCHAR(255) NOT NULL,
      category    VARCHAR(50)  NOT NULL DEFAULT 'boshqa',
      price       NUMERIC      NOT NULL,
      unit        VARCHAR(50)  NOT NULL DEFAULT 'dona',
      qty         INTEGER      NOT NULL,
      condition   VARCHAR(50)  DEFAULT 'Yaxshi',
      viloyat     VARCHAR(255) NOT NULL,
      tuman       VARCHAR(255) DEFAULT '',
      photo       TEXT,
      owner_id    UUID         NOT NULL REFERENCES users(id),
      is_active   BOOLEAN      DEFAULT TRUE,
      created_at  TIMESTAMPTZ  DEFAULT NOW(),
      updated_at  TIMESTAMPTZ  DEFAULT NOW()
    );

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
    DECLARE r RECORD;
      sid TEXT;
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
    CREATE INDEX IF NOT EXISTS idx_products_owner ON products (owner_id);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
    CREATE INDEX IF NOT EXISTS idx_offers_buyer ON offers (buyer_id);
    CREATE INDEX IF NOT EXISTS idx_offers_seller ON offers (seller_id);
  `);
}

module.exports = { connect, query };
