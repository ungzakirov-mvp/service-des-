import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SQL = `
-- Таблица товаров
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  price DECIMAL(15, 2),
  currency VARCHAR(10) DEFAULT 'UZS',
  supplier VARCHAR(255),
  category VARCHAR(100),
  link VARCHAR(1000),
  source_message_id VARCHAR(100),
  source_channel VARCHAR(255),
  image_url TEXT,
  is_posted BOOLEAN DEFAULT FALSE,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица каналов поставщиков
CREATE TABLE IF NOT EXISTS supplier_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id VARCHAR(255) UNIQUE NOT NULL,
  channel_name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для постов на сайт
CREATE TABLE IF NOT EXISTS site_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  title VARCHAR(500),
  content TEXT,
  image_url TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  slug VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица логов
CREATE TABLE IF NOT EXISTS bot_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level VARCHAR(20) DEFAULT 'info',
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_products_is_posted ON products(is_posted);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Включить RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_posts ENABLE ROW LEVEL SECURITY;

-- Политики доступа (для Supabase anon key)
CREATE POLICY "Разрешить чтение товаров" ON products
  FOR SELECT USING (true);

CREATE POLICY "Разрешить вставку товаров" ON products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Разрешить обновление товаров" ON products
  FOR UPDATE USING (true);

CREATE POLICY "Разрешить чтение каналов" ON supplier_channels
  FOR SELECT USING (true);

CREATE POLICY "Разрешить чтение постов" ON site_posts
  FOR SELECT USING (true);
`;

async function setup() {
  console.log("🔧 Настройка базы данных...\n");

  try {
    const { error } = await supabase.rpc("exec", { sql: SQL });
    
    if (error) {
      console.log("Попытка через SQL запросы...");
    }
    
    console.log("✅ Таблицы созданы:");
    console.log("   - products (товары)");
    console.log("   - supplier_channels (каналы поставщиков)");
    console.log("   - site_posts (посты на сайт)");
    console.log("   - bot_logs (логи бота)");
    
    console.log("\n📝 Следующие шаги:");
    console.log("1. Создайте файл .env с токенами");
    console.log("2. Запустите бота: npm start");
    
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
    console.log("\n⚠️  Возможно, вам нужно выполнить SQL вручную в Supabase Dashboard");
    console.log("   Скопируйте SQL из файла src/setup-database.js");
  }
}

setup();
