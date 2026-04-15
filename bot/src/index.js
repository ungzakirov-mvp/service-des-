import { Bot, GrammyError, HttpError } from "grammy";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import cron from "node-cron";

dotenv.config();

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const OUTPUT_CHANNEL_ID = process.env.OUTPUT_CHANNEL_ID;

const SUPPLIER_CHANNELS = [
  { id: process.env.SUPPLIER_CHANNEL_1, name: "Поставщик 1" },
  { id: process.env.SUPPLIER_CHANNEL_2, name: "Поставщик 2" },
];

const PRODUCT_KEYWORDS = [
  "компьютер", "ноутбук", "сервер", "монитор", "принтер", "сканер",
  "ксерокс", "router", "роутер", "свитч", "коммутатор", "ip-телефония",
  "web-камера", "веб-камера", "гарнитура", "наушники", "клавиатура",
  "мышь", "mouse", "keyboard", "ups", "источник бесперебойного питания",
  "кабель", "сетевой кабель", "розетка", "патч-корд", "свич"
];

const PRICE_PATTERNS = [
  /(\d{1,3}(?:\s\d{3})*)\s*(?:сум|уе|usd|доллар)/gi,
  /(\d+\.?\d*)\s*(?:млн|тыс)/gi,
  /цена[:\s]+(\d+)/gi
];

function extractPrice(text) {
  for (const pattern of PRICE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const price = parseInt(match[1].replace(/\s/g, ""), 10);
      if (!isNaN(price) && price > 1000) {
        return { value: price, currency: "UZS", raw: match[0] };
      }
    }
  }
  return null;
}

function extractProducts(text) {
  const products = [];
  const lowerText = text.toLowerCase();
  
  for (const keyword of PRODUCT_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      const index = lowerText.indexOf(keyword);
      const context = text.substring(Math.max(0, index - 50), Math.min(text.length, index + 100));
      const price = extractPrice(context);
      
      if (price || keyword.length > 5) {
        products.push({
          keyword,
          context,
          price: price?.value,
          currency: price?.currency || "UZS"
        });
      }
    }
  }
  
  return products;
}

function formatProductForPost(product) {
  return `
🖥 ${product.name}
💰 Цена: ${product.price?.toLocaleString("ru-RU")} ${product.currency}
📋 ${product.description || ""}
🔗 ${product.link || ""}
  `.trim();
}

async function saveProduct(product) {
  const { data, error } = await supabase
    .from("products")
    .insert([
      {
        name: product.name,
        description: product.description,
        price: product.price,
        currency: product.currency,
        supplier: product.supplier,
        source_message_id: product.messageId,
        source_channel: product.channel,
        link: product.link,
        category: product.category,
        is_posted: false,
        created_at: new Date().toISOString()
      }
    ])
    .select()
    .single();

  if (error) {
    console.error("Ошибка сохранения товара:", error);
    return null;
  }
  
  return data;
}

async function postToChannel(product) {
  if (!OUTPUT_CHANNEL_ID) {
    console.log("OUTPUT_CHANNEL_ID не настроен, пропускаем пост");
    return false;
  }

  const message = formatProductForPost(product);
  
  try {
    await bot.api.sendMessage(OUTPUT_CHANNEL_ID, message, {
      parse_mode: "HTML"
    });
    
    await supabase
      .from("products")
      .update({ is_posted: true, posted_at: new Date().toISOString() })
      .eq("id", product.id);
    
    return true;
  } catch (error) {
    console.error("Ошибка постинга:", error);
    return false;
  }
}

async function processNewMessage(channelId, channelName, messageId, text) {
  console.log(`[${channelName}] Новое сообщение: ${messageId}`);
  
  const products = extractProducts(text);
  
  for (const item of products) {
    const product = {
      name: item.context.substring(0, 100),
      description: item.context,
      price: item.price,
      currency: item.currency,
      supplier: channelName,
      messageId: messageId,
      channel: channelId,
      category: item.keyword
    };
    
    const saved = await saveProduct(product);
    
    if (saved) {
      console.log(`✅ Сохранён товар: ${item.keyword} - ${item.price || "без цены"} ${item.currency}`);
    }
  }
}

bot.on("message", async (ctx) => {
  const message = ctx.message;
  if (!message || !message.text) return;
  
  if (ctx.chat.id.toString() === ADMIN_CHAT_ID) {
    if (message.text.startsWith("/start")) {
      await ctx.reply("🤖 Бот помощник запущен!\n\nМониторинг каналов поставщиков активен.");
    }
    
    if (message.text.startsWith("/stats")) {
      const { count } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });
      
      const { count: unposted } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("is_posted", false);
      
      await ctx.reply(`📊 Статистика:\n\nВсего товаров: ${count || 0}\nНе опубликовано: ${unposted || 0}`);
    }
    
    if (message.text.startsWith("/post")) {
      const { data: unposted } = await supabase
        .from("products")
        .select("*")
        .eq("is_posted", false)
        .limit(10);
      
      let posted = 0;
      for (const product of unposted || []) {
        if (await postToChannel(product)) {
          posted++;
        }
      }
      
      await ctx.reply(`✅ Опубликовано ${posted} товаров`);
    }
    
    if (message.text.startsWith("/channels")) {
      const status = SUPPLIER_CHANNELS
        .map(ch => `• ${ch.name}: ${ch.id || "не настроен"}`)
        .join("\n");
      await ctx.reply(`📡 Каналы поставщиков:\n\n${status}`);
    }
  }
});

async function startBot() {
  console.log("🤖 Бот Novum Tech Helper запущен!");
  console.log("================================");
  
  if (ADMIN_CHAT_ID) {
    try {
      await bot.api.sendMessage(
        ADMIN_CHAT_ID,
        "🚀 Бот помощник запущен!\n\nБуду собирать товары из каналов поставщиков."
      );
    } catch (e) {
      console.log("Не удалось отправить сообщение админу (бот не запущен в ЛС)");
    }
  }
  
  await bot.start();
}

startBot().catch(console.error);
