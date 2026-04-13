import { Bot } from "grammy";
import { createClient } from "@supabase/supabase-js";
import cron from "node-cron";
import dotenv from "dotenv";

dotenv.config();

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!botToken || !supabaseUrl || !supabaseKey) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN / SUPABASE_URL / SUPABASE_SERVICE_KEY in .env");
}

const bot = new Bot(botToken);
const supabase = createClient(supabaseUrl, supabaseKey);

bot.catch((err) => {
  console.error("Telegram bot runtime error:", err.error || err);
});

const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "8374898260";
const LEAD_CITY = process.env.LEAD_CITY || "Ташкент";
const DAILY_REPORT_CRON = process.env.DAILY_REPORT_CRON || "0 9 * * *";
const EVENING_REPORT_CRON = process.env.EVENING_REPORT_CRON || "0 18 * * *";
const DAILY_REPORT_TIMEZONE = process.env.DAILY_REPORT_TIMEZONE || "Asia/Tashkent";
const LEAD_AGGRESSIVE_MODE = String(process.env.LEAD_AGGRESSIVE_MODE || "true").toLowerCase() === "true";
const AUTO_OUTREACH = String(process.env.AUTO_OUTREACH || "false").toLowerCase() === "true";
const AUTO_OUTREACH_CRON = process.env.AUTO_OUTREACH_CRON || "30 9 * * *";
const MAX_DAILY_OUTREACH = Number(process.env.MAX_DAILY_OUTREACH || 8);
const MAX_OUTREACH_ATTEMPTS = Number(process.env.MAX_OUTREACH_ATTEMPTS || 3);
const MIN_CONTACT_INTERVAL_DAYS = Number(process.env.MIN_CONTACT_INTERVAL_DAYS || 7);
const OUTREACH_DRY_RUN = String(process.env.OUTREACH_DRY_RUN || "true").toLowerCase() === "true";

const BASE_QUERIES = [
  `логистика ${LEAD_CITY} контакты`,
  `производство ${LEAD_CITY} контакты`,
  `ритейл ${LEAD_CITY} контакты`,
  `дистрибьютор ${LEAD_CITY} контакты`,
  `медицинский центр ${LEAD_CITY} контакты`,
  `строительная компания ${LEAD_CITY} контакты`,
  `отель ${LEAD_CITY} контакты`,
  `сеть магазинов ${LEAD_CITY} контакты`,
  `девелопер ${LEAD_CITY} контакты`,
  `фармацевтическая компания ${LEAD_CITY} контакты`,
  `клиника ${LEAD_CITY} контакты`,
  `логистическая компания ${LEAD_CITY} email`,
  `b2b компания ${LEAD_CITY} контакты`,
];

const LOW_QUALITY_DOMAINS = new Set([
  "2gis.ru",
  "yandex.ru",
  "google.com",
  "maps.google.com",
  "instagram.com",
  "t.me",
  "facebook.com",
]);

function buildQueryVariants(baseQuery) {
  return [
    baseQuery,
    `${baseQuery} официальный сайт site:.uz -2gis -yandex -maps`,
    `${baseQuery} сайт компании -2gis -yandex -maps`,
  ];
}

function adminOnly(ctx) {
  return String(ctx.chat?.id || "") === String(ADMIN_CHAT_ID);
}

function normalizeDomain(input) {
  if (!input) return null;
  try {
    const normalized = input.startsWith("http") ? input : `https://${input}`;
    return new URL(normalized).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function inferIndustry(text) {
  const t = (text || "").toLowerCase();
  if (t.includes("логист") || t.includes("достав") || t.includes("склад")) return "логистика";
  if (t.includes("ритейл") || t.includes("магаз") || t.includes("маркет")) return "ритейл";
  if (t.includes("клиник") || t.includes("мед") || t.includes("hospital")) return "медицина";
  if (t.includes("завод") || t.includes("производ") || t.includes("factory")) return "производство";
  if (t.includes("строит") || t.includes("девелоп") || t.includes("подряд")) return "строительство";
  if (t.includes("отел") || t.includes("hotel") || t.includes("гостиниц")) return "гостиницы";
  return "общая";
}

function extractContacts(text) {
  const emails = [...new Set((text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map((x) => x.toLowerCase()))];
  const telegrams = [...new Set((text.match(/(?:https?:\/\/t\.me\/|@)[a-zA-Z0-9_]{4,}/g) || []).map((x) => x.replace("https://t.me/", "@").toLowerCase()))];
  const phones = [...new Set((text.match(/\+?\d[\d\s\-()]{8,}\d/g) || []).map((x) => x.replace(/\s+/g, " ").trim()))];
  return { emails, telegrams, phones };
}

function calcScore(lead) {
  let score = 0;
  if (lead.email) score += 40;
  if (lead.telegram) score += 25;
  if (lead.phone) score += 20;
  if (lead.website) score += 10;
  if ((lead.company_name || "").length > 3) score += 5;
  if ((lead.source || "").includes("email")) score += 5;
  if (lead.industry && lead.industry !== "общая") score += 5;
  return Math.min(score, 100);
}

function preferredChannel(lead) {
  if (lead.email) return "email";
  if (lead.telegram) return "telegram";
  if (lead.phone) return "call";
  return "none";
}

async function upsertLead(lead) {
  const domain = normalizeDomain(lead.website || lead.domain || "");
  if (!LEAD_AGGRESSIVE_MODE && domain && LOW_QUALITY_DOMAINS.has(domain)) return null;
  if (!domain && !lead.email && !lead.telegram && !lead.phone) return null;

  const payload = {
    company_name: lead.company_name || domain || "Компания без названия",
    website: lead.website || (domain ? `https://${domain}` : null),
    domain,
    email: lead.email || null,
    telegram: lead.telegram || null,
    phone: lead.phone || null,
    city: LEAD_CITY,
    source: lead.source || "manual",
    score: calcScore(lead),
    status: lead.status || "new",
    notes: lead.notes || null,
    outreach_channel: lead.outreach_channel || "telegram,email",
    industry: lead.industry || "общая",
  };

  const { data, error } = await supabase
    .from("leads")
    .upsert(payload, { onConflict: "domain" })
    .select("id, company_name, score, status, email, telegram, website")
    .single();

  if (error) {
    console.error("upsertLead error", error.message);
    return null;
  }
  return data;
}

async function runSerperSearch(query, num = 10) {
  const key = process.env.SERPER_API_KEY;
  if (!key) return [];

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, gl: "uz", hl: "ru", num }),
  });

  if (!response.ok) {
    const reason = await response.text();
    console.error(`SERPER error for query "${query}": ${response.status} ${reason}`);
    return [];
  }
  const json = await response.json();
  return json.organic || [];
}

async function enrichFromWebsite(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 Lead-Agent" } });
    if (!res.ok) return {};
    const html = await res.text();
    const contacts = extractContacts(html);
    return {
      email: contacts.emails[0] || null,
      telegram: contacts.telegrams[0] || null,
      phone: contacts.phones[0] || null,
    };
  } catch {
    return {};
  }
}

async function scanLeads(limitQueries = 3) {
  let saved = 0;
  let totalResults = 0;
  let totalCandidates = 0;
  let filteredLowQuality = 0;
  let upsertErrors = 0;
  for (const baseQuery of BASE_QUERIES.slice(0, limitQueries)) {
    for (const query of buildQueryVariants(baseQuery)) {
      const results = await runSerperSearch(query, 8);
      totalResults += results.length;
      console.log(`[scan] query="${query}" results=${results.length}`);
      for (const item of results) {
      const website = item.link || item.displayLink || "";
      const domain = normalizeDomain(website || item.displayLink || "");
      const snippetBlob = `${item.title || ""} ${item.snippet || ""}`;
      const snippetContacts = extractContacts(snippetBlob);

      if (!LEAD_AGGRESSIVE_MODE && domain && LOW_QUALITY_DOMAINS.has(domain)) {
        filteredLowQuality += 1;
        continue;
      }

      if (!domain && !snippetContacts.emails[0] && !snippetContacts.telegrams[0] && !snippetContacts.phones[0]) {
        continue;
      }
      totalCandidates += 1;

      const enriched = await enrichFromWebsite(website);
      const lead = await upsertLead({
        company_name: item.title?.slice(0, 120) || domain || "Компания без названия",
        website: website || (domain ? `https://${domain}` : null),
        domain,
        email: enriched.email || snippetContacts.emails[0] || null,
        telegram: enriched.telegram || snippetContacts.telegrams[0] || null,
        phone: enriched.phone || snippetContacts.phones[0] || null,
        source: `serper:${query}`,
        notes: item.snippet || null,
        industry: inferIndustry(`${query} ${item.title || ""} ${item.snippet || ""}`),
      });
      if (lead) {
        saved += 1;
      } else {
        upsertErrors += 1;
      }
      }
    }
  }
  console.log(`[scan] total_results=${totalResults} total_candidates=${totalCandidates} filtered=${filteredLowQuality} saved=${saved} upsert_errors=${upsertErrors}`);
  return { saved, totalResults, totalCandidates, filteredLowQuality, upsertErrors };
}

function buildTelegramPitch(lead) {
  return [
    "Здравствуйте!",
    "Я из Novum Tech, Ташкент.",
    "Помогаем компаниям выстроить стабильную IT-поддержку: Service Desk, серверы, безопасность, рабочие места.",
    "Если удобно, отправлю короткий бесплатный экспресс-аудит (3 практичных пункта), где можно снизить простои и риски.",
    "Направить?",
  ].join("\n");
}

function buildTelegramVariants(lead) {
  return [
    "Здравствуйте! Мы в Novum Tech помогаем компаниям в Ташкенте быстрее закрывать IT-заявки и уменьшать простои. Могу отправить короткий бесплатный аудит (3 пункта)?",
    "Добрый день! Подскажите, у вас есть SLA по IT-поддержке? Обычно после внедрения Service Desk скорость реакции заметно растёт уже в первые недели. Если интересно, скину короткий кейс.",
    "Здравствуйте! Если сейчас не время для полноценного обсуждения, могу отправить полезный чек-лист «10 типовых IT-рисков» — бесплатно и без обязательств."
  ];
}

function buildEmailPitch(lead) {
  const subject = "Идея, как снизить IT-риски и простои";
  const body = [
    "Добрый день!",
    "",
    "Меня зовут Улугбек, компания Novum Tech (Ташкент).",
    "Мы помогаем бизнесу уменьшать простои и ускорять поддержку сотрудников: Service Desk, серверы, сеть, безопасность.",
    "",
    "Можем бесплатно сделать мини-аудит и показать 2-3 точки, где можно быстро улучшить стабильность IT.",
    "",
    "Если актуально — ответьте на это письмо, и отправим короткий план.",
    "",
    "С уважением,",
    "Novum Tech",
    "+998 99 998-17-77",
    "support@novumtech.uz",
  ].join("\n");
  return { subject, body };
}

async function logLeadActivity(leadId, channel, activityType, payload = {}) {
  await supabase.from("lead_activity").insert({
    lead_id: leadId,
    channel,
    activity_type: activityType,
    payload,
  });
}

function canContactLead(lead) {
  if (lead.do_not_contact) return { ok: false, reason: "do_not_contact" };
  if ((lead.outreach_attempts || 0) >= MAX_OUTREACH_ATTEMPTS) return { ok: false, reason: "max_attempts" };
  if (!lead.email && !lead.telegram) return { ok: false, reason: "no_channel" };
  if (lead.last_contacted_at) {
    const days = (Date.now() - new Date(lead.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24);
    if (days < MIN_CONTACT_INTERVAL_DAYS) return { ok: false, reason: "cooldown" };
  }
  return { ok: true, reason: "ok" };
}

async function sendEmailViaResend(to, subject, bodyText) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "Novum Tech <support@novumtech.uz>";
  if (!apiKey) {
    return { sent: false, reason: "missing_resend_api_key" };
  }
  if (OUTREACH_DRY_RUN) {
    return { sent: false, reason: "dry_run" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: bodyText,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    return { sent: false, reason: `resend_error:${response.status}:${errText}` };
  }
  return { sent: true, reason: "sent" };
}

async function getOutreachCandidates(limit = MAX_DAILY_OUTREACH) {
  const { data } = await supabase
    .from("leads")
    .select("id, company_name, email, telegram, phone, score, status, last_contacted_at, outreach_attempts, do_not_contact, website")
    .in("status", ["new", "contacted"])
    .order("score", { ascending: false })
    .limit(100);

  const filtered = (data || []).filter((lead) => canContactLead(lead).ok);
  return filtered.slice(0, Math.max(1, limit));
}

async function runAutoOutreach() {
  const candidates = await getOutreachCandidates(MAX_DAILY_OUTREACH);
  if (!candidates.length) {
    await bot.api.sendMessage(ADMIN_CHAT_ID, "📭 Auto outreach: сегодня нет подходящих лидов.");
    return;
  }

  let emailSent = 0;
  let emailSkipped = 0;
  const manualTelegramTasks = [];

  for (const lead of candidates) {
    const pitchEmail = buildEmailPitch(lead);
    const pitchTg = buildTelegramPitch(lead);

    if (lead.email) {
      const emailResult = await sendEmailViaResend(lead.email, pitchEmail.subject, pitchEmail.body);
      if (emailResult.sent) {
        emailSent += 1;
        await logLeadActivity(lead.id, "email", "outreach", { subject: pitchEmail.subject, mode: OUTREACH_DRY_RUN ? "dry_run" : "live" });
      } else {
        emailSkipped += 1;
        await logLeadActivity(lead.id, "email", "note", { reason: emailResult.reason });
      }
    }

    if (lead.telegram) {
      manualTelegramTasks.push(`• ${lead.company_name} (${lead.telegram})\n${pitchTg}`);
      await logLeadActivity(lead.id, "telegram", "outreach", { mode: "manual_task_generated" });
    }

    await supabase
      .from("leads")
      .update({
        status: "contacted",
        last_contacted_at: new Date().toISOString(),
        outreach_attempts: (lead.outreach_attempts || 0) + 1,
      })
      .eq("id", lead.id);
  }

  const summary = [
    "🤖 Auto outreach выполнен",
    `Кандидатов: ${candidates.length}`,
    `Email отправлено: ${emailSent}`,
    `Email пропущено: ${emailSkipped}`,
    `Telegram задач: ${manualTelegramTasks.length}`,
    `Режим: ${OUTREACH_DRY_RUN ? "DRY RUN" : "LIVE"}`,
  ].join("\n");

  await bot.api.sendMessage(ADMIN_CHAT_ID, summary);

  if (manualTelegramTasks.length) {
    const chunk = manualTelegramTasks.slice(0, 3).join("\n\n");
    await bot.api.sendMessage(ADMIN_CHAT_ID, `🧾 Telegram задачи (первые 3):\n\n${chunk}`);
  }
}

async function getTopLeads(limit = 10) {
  const { data } = await supabase
    .from("leads")
    .select("id, company_name, score, email, telegram, phone, status, website, industry, last_contacted_at")
    .in("status", ["new", "contacted", "meeting", "proposal"])
    .order("score", { ascending: false })
    .limit(limit);
  return data || [];
}

async function resolveLeadId(input) {
  const value = (input || "").trim();
  if (!value) return null;
  if (value.length >= 30) return value;

  const { data } = await supabase
    .from("leads")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(500);

  const row = (data || []).find((x) => x.id.startsWith(value));
  return row ? row.id : null;
}

async function getFollowupLeads(limit = 10) {
  const threshold = new Date(Date.now() - MIN_CONTACT_INTERVAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("leads")
    .select("id, company_name, score, email, telegram, phone, status, last_contacted_at")
    .in("status", ["contacted", "meeting", "proposal"])
    .lt("last_contacted_at", threshold)
    .order("score", { ascending: false })
    .limit(limit);
  return data || [];
}

async function getDailyPlan(limit = 12) {
  const hot = (await getTopLeads(limit)).filter((l) => l.score >= 60);
  const followups = await getFollowupLeads(limit);

  const byId = new Map();
  for (const lead of [...hot, ...followups]) {
    if (!byId.has(lead.id)) byId.set(lead.id, lead);
  }

  const merged = [...byId.values()]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, limit);

  return merged.map((lead, idx) => ({
    ...lead,
    priority: idx + 1,
    action: lead.status === "new" ? "first_contact" : "followup",
    channel: preferredChannel(lead),
  }));
}

async function getCrmSummary() {
  const statuses = ["new", "contacted", "meeting", "proposal", "won", "lost"];
  const counts = {};
  for (const status of statuses) {
    const { count } = await supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", status);
    counts[status] = count || 0;
  }

  const { data: pipelineRows } = await supabase
    .from("leads")
    .select("status, deal_value")
    .in("status", ["meeting", "proposal", "won"]);

  const safeValue = (x) => (typeof x === "number" && Number.isFinite(x) ? x : 0);
  const meetingValue = (pipelineRows || []).filter((x) => x.status === "meeting").reduce((s, x) => s + safeValue(x.deal_value), 0);
  const proposalValue = (pipelineRows || []).filter((x) => x.status === "proposal").reduce((s, x) => s + safeValue(x.deal_value), 0);
  const wonValue = (pipelineRows || []).filter((x) => x.status === "won").reduce((s, x) => s + safeValue(x.deal_value), 0);

  // Простая модель прогноза: meeting 30%, proposal 60%, won 100%
  const forecastValue = Math.round(meetingValue * 0.3 + proposalValue * 0.6 + wonValue);

  return {
    counts,
    meetingValue,
    proposalValue,
    wonValue,
    forecastValue,
  };
}

async function sendDailyReport() {
  const leads = await getTopLeads(10);
  const { count: newCount } = await supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "new");
  const { count: wonCount } = await supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "won");

  const list = leads
    .map((l, i) => `${i + 1}. ${l.company_name} | score ${l.score} | ${l.email || l.telegram || "no contact"}`)
    .join("\n");

  const text = [
    "📈 Ежедневный отчёт Lead Agent",
    `Город: ${LEAD_CITY}`,
    `Новых лидов: ${newCount || 0}`,
    `Сделок won: ${wonCount || 0}`,
    "",
    "Топ лидов:",
    list || "Пока нет",
  ].join("\n");

  await bot.api.sendMessage(ADMIN_CHAT_ID, text);
}

async function sendEveningFollowupReport() {
  const leads = await getFollowupLeads(10);
  const list = leads
    .map((l, i) => `${i + 1}. ${l.company_name} | ${l.status} | ${l.email || l.telegram || l.phone || "no contact"}`)
    .join("\n");

  const text = [
    "🌙 Вечерний follow-up отчёт",
    `Кандидаты на дожим: ${leads.length}`,
    "",
    list || "На сегодня кандидатов нет",
  ].join("\n");

  await bot.api.sendMessage(ADMIN_CHAT_ID, text);
}

bot.command("start", async (ctx) => {
  if (!adminOnly(ctx)) return;
  await ctx.reply(
    [
      "🤖 Lead Agent запущен.",
      "Команды:",
      "/scan [n] - поиск новых лидов (n=кол-во ниш, по умолчанию 3)",
      "/today - топ лидов",
      "/next - следующий новый лид",
      "/hot [n] - горячие лиды",
      "/followups [n] - кого дожимать сегодня",
      "/batchpitch [n] - пачка готовых сообщений",
      "/plan [n] - план касаний на сегодня",
      "/crm - сводка воронки и прогноз",
      "/pitch <id> - шаблоны Telegram+Email",
      "/nudge <id> - 3 варианта 1-го/2-го касания",
      "/value <id> <сумма> - задать ценность лида",
      "/result <id> <interested|meeting|no_reply|not_now|wrong_contact|won|lost>",
      "/status <id> <new|contacted|meeting|proposal|won|lost>",
      "/addlead Компания | сайт | email | telegram | телефон",
      "/autopilot - запустить авто outreach сейчас",
      "/dnc <id> on|off - запретить/разрешить контакт",
      "/stats - воронка",
    ].join("\n")
  );
});

bot.command("scan", async (ctx) => {
  if (!adminOnly(ctx)) return;
  const arg = Number(ctx.match || 3);
  const queryCount = Number.isFinite(arg) && arg > 0 ? Math.min(arg, 8) : 3;

  if (!process.env.SERPER_API_KEY) {
    await ctx.reply("⚠️ Нет SERPER_API_KEY в .env. Могу работать в manual режиме через /addlead.");
    return;
  }

  await ctx.reply(`🔎 Запускаю поиск лидов по ${queryCount} нишам...`);
  const result = await scanLeads(queryCount);
  if (result.saved === 0) {
    await ctx.reply(
      `⚠️ Готово, лидов 0.\nresults=${result.totalResults}, candidates=${result.totalCandidates}, filtered=${result.filteredLowQuality}, upsert_errors=${result.upsertErrors}.\nПроверь Logs и выполни /scan 8.`
    );
  } else {
    await ctx.reply(
      `✅ Готово. Добавлено/обновлено лидов: ${result.saved}\nresults=${result.totalResults}, candidates=${result.totalCandidates}, filtered=${result.filteredLowQuality}.`
    );
  }
});

bot.command("today", async (ctx) => {
  if (!adminOnly(ctx)) return;
  const leads = await getTopLeads(10);
  if (!leads.length) {
    await ctx.reply("Пока нет лидов. Запусти /scan или /addlead.");
    return;
  }
  const msg = leads
    .map((l) => `#${l.id.slice(0, 8)} | ${l.company_name} | score ${l.score} | ${preferredChannel(l)}\n${l.email || ""} ${l.telegram || ""} ${l.phone || ""}`)
    .join("\n\n");
  await ctx.reply(`🎯 Топ лидов:\n\n${msg}`);
});

bot.command("hot", async (ctx) => {
  if (!adminOnly(ctx)) return;
  const arg = Number(ctx.match || 10);
  const limit = Number.isFinite(arg) && arg > 0 ? Math.min(arg, 20) : 10;
  const leads = (await getTopLeads(limit)).filter((l) => l.score >= 60);
  if (!leads.length) {
    await ctx.reply("Пока нет hot лидов (score 60+). Сделай /scan 8.");
    return;
  }
  const msg = leads
    .map((l) => `#${l.id.slice(0, 8)} | ${l.company_name} | score ${l.score} | ${l.industry || "общая"} | ${preferredChannel(l)}`)
    .join("\n");
  await ctx.reply(`🔥 Hot лиды:\n\n${msg}`);
});

bot.command("followups", async (ctx) => {
  if (!adminOnly(ctx)) return;
  const arg = Number(ctx.match || 10);
  const limit = Number.isFinite(arg) && arg > 0 ? Math.min(arg, 20) : 10;
  const leads = await getFollowupLeads(limit);
  if (!leads.length) {
    await ctx.reply("Сегодня кандидатов на follow-up нет.");
    return;
  }
  const msg = leads
    .map((l) => `#${l.id.slice(0, 8)} | ${l.company_name} | ${l.status} | ${l.email || l.telegram || l.phone || "no contact"}`)
    .join("\n");
  await ctx.reply(`🔁 Follow-up список:\n\n${msg}`);
});

bot.command("batchpitch", async (ctx) => {
  if (!adminOnly(ctx)) return;
  const arg = Number(ctx.match || 3);
  const limit = Number.isFinite(arg) && arg > 0 ? Math.min(arg, 10) : 3;
  const leads = await getTopLeads(limit);
  if (!leads.length) {
    await ctx.reply("Нет лидов для batch pitch.");
    return;
  }
  for (const lead of leads) {
    const tg = buildTelegramPitch(lead);
    await ctx.reply(`🧩 ${lead.company_name}\nКанал: ${preferredChannel(lead)}\n\n${tg}`);
  }
});

bot.command("plan", async (ctx) => {
  if (!adminOnly(ctx)) return;
  const arg = Number(ctx.match || 10);
  const limit = Number.isFinite(arg) && arg > 0 ? Math.min(arg, 20) : 10;
  const plan = await getDailyPlan(limit);

  if (!plan.length) {
    await ctx.reply("План пуст. Запусти /scan 8 и проверь /hot.");
    return;
  }

  const lines = plan.map(
    (p) => `${p.priority}. ${p.company_name} | ${p.action} | ${p.channel} | score ${p.score}`
  );

  await ctx.reply(`📅 План на сегодня (${plan.length})\n\n${lines.join("\n")}`);
});

bot.command("next", async (ctx) => {
  if (!adminOnly(ctx)) return;
  const { data } = await supabase
    .from("leads")
    .select("id, company_name, score, email, telegram, phone, website, status")
    .eq("status", "new")
    .order("score", { ascending: false })
    .limit(1)
    .single();

  if (!data) {
    await ctx.reply("Нет новых лидов.");
    return;
  }

  await ctx.reply(
    [
      `🎯 Следующий лид: ${data.company_name}`,
      `ID: ${data.id}`,
      `Score: ${data.score}`,
      `Сайт: ${data.website || "-"}`,
      `Email: ${data.email || "-"}`,
      `Telegram: ${data.telegram || "-"}`,
      `Телефон: ${data.phone || "-"}`,
      `Далее: /pitch ${data.id}`,
    ].join("\n")
  );
});

bot.command("pitch", async (ctx) => {
  if (!adminOnly(ctx)) return;
  const rawId = (ctx.match || "").trim();
  if (!rawId) {
    await ctx.reply("Используй: /pitch <id>");
    return;
  }
  const id = await resolveLeadId(rawId);
  if (!id) {
    await ctx.reply("Лид не найден по этому id/префиксу.");
    return;
  }
  const { data } = await supabase
    .from("leads")
    .select("id, company_name, email, telegram")
    .eq("id", id)
    .single();

  if (!data) {
    await ctx.reply("Лид не найден.");
    return;
  }

  const tg = buildTelegramPitch(data);
  const email = buildEmailPitch(data);
  await ctx.reply(`📩 Telegram:\n\n${tg}`);
  await ctx.reply(`📧 Email subject: ${email.subject}\n\n${email.body}`);
});

bot.command("nudge", async (ctx) => {
  if (!adminOnly(ctx)) return;
  const rawId = (ctx.match || "").trim();
  if (!rawId) {
    await ctx.reply("Используй: /nudge <id>");
    return;
  }
  const id = await resolveLeadId(rawId);
  if (!id) {
    await ctx.reply("Лид не найден по этому id/префиксу.");
    return;
  }

  const { data } = await supabase
    .from("leads")
    .select("id, company_name, email, telegram, status")
    .eq("id", id)
    .single();

  if (!data) {
    await ctx.reply("Лид не найден.");
    return;
  }

  const variants = buildTelegramVariants(data);
  await ctx.reply(
    [
      `🎯 ${data.company_name} (#${data.id.slice(0, 8)})`,
      `Статус: ${data.status}`,
      "",
      `Вариант 1:\n${variants[0]}`,
      "",
      `Вариант 2:\n${variants[1]}`,
      "",
      `Вариант 3:\n${variants[2]}`,
      "",
      `После отправки отметь результат: /result ${data.id.slice(0, 8)} interested|meeting|no_reply|not_now|wrong_contact|won|lost`,
    ].join("\n")
  );
});

bot.command("result", async (ctx) => {
  if (!adminOnly(ctx)) return;
  const [rawId, outcome] = (ctx.match || "").trim().split(/\s+/);
  const allowed = new Set(["interested", "meeting", "no_reply", "not_now", "wrong_contact", "won", "lost"]);
  if (!rawId || !allowed.has(outcome)) {
    await ctx.reply("Используй: /result <id> <interested|meeting|no_reply|not_now|wrong_contact|won|lost>");
    return;
  }
  const id = await resolveLeadId(rawId);
  if (!id) {
    await ctx.reply("Лид не найден по этому id/префиксу.");
    return;
  }

  const map = {
    interested: "proposal",
    meeting: "meeting",
    no_reply: "contacted",
    not_now: "contacted",
    wrong_contact: "lost",
    won: "won",
    lost: "lost",
  };

  const patch = {
    status: map[outcome],
    last_contacted_at: new Date().toISOString(),
  };

  if (outcome === "wrong_contact" || outcome === "lost") {
    patch.do_not_contact = true;
  }

  const { error } = await supabase.from("leads").update(patch).eq("id", id);
  if (error) {
    await ctx.reply(`Ошибка обновления: ${error.message}`);
    return;
  }

  await logLeadActivity(id, "other", "note", { outcome, mapped_status: map[outcome] });
  await ctx.reply(`✅ Результат сохранён: ${outcome} -> ${map[outcome]}`);
});

bot.command("value", async (ctx) => {
  if (!adminOnly(ctx)) return;
  const [rawId, rawAmount] = (ctx.match || "").trim().split(/\s+/);
  const amount = Number((rawAmount || "").replace(/[^\d.]/g, ""));
  if (!rawId || !Number.isFinite(amount) || amount <= 0) {
    await ctx.reply("Используй: /value <id> <сумма>, например /value ab12cd34 25000000");
    return;
  }
  const id = await resolveLeadId(rawId);
  if (!id) {
    await ctx.reply("Лид не найден по этому id/префиксу.");
    return;
  }

  const { error } = await supabase.from("leads").update({ deal_value: amount }).eq("id", id);
  if (error) {
    await ctx.reply(`Ошибка обновления: ${error.message}`);
    return;
  }

  await logLeadActivity(id, "other", "note", { deal_value: amount, currency: "UZS" });
  await ctx.reply(`💰 Ценность лида сохранена: ${amount.toLocaleString("ru-RU")} UZS`);
});

bot.command("crm", async (ctx) => {
  if (!adminOnly(ctx)) return;
  const s = await getCrmSummary();
  const money = (n) => `${Math.round(n).toLocaleString("ru-RU")} UZS`;

  await ctx.reply(
    [
      "📊 CRM сводка",
      `new: ${s.counts.new}`,
      `contacted: ${s.counts.contacted}`,
      `meeting: ${s.counts.meeting}`,
      `proposal: ${s.counts.proposal}`,
      `won: ${s.counts.won}`,
      `lost: ${s.counts.lost}`,
      "",
      `Встречи (pipeline): ${money(s.meetingValue)}`,
      `КП (pipeline): ${money(s.proposalValue)}`,
      `Won: ${money(s.wonValue)}`,
      `Прогноз выручки: ${money(s.forecastValue)}`,
    ].join("\n")
  );
});

bot.command("status", async (ctx) => {
  if (!adminOnly(ctx)) return;
  const [id, status] = (ctx.match || "").trim().split(/\s+/);
  const allowed = new Set(["new", "contacted", "meeting", "proposal", "won", "lost"]);
  if (!id || !allowed.has(status)) {
    await ctx.reply("Используй: /status <id> <new|contacted|meeting|proposal|won|lost>");
    return;
  }
  const patch = { status };
  if (status !== "new") patch.last_contacted_at = new Date().toISOString();

  const { error } = await supabase.from("leads").update(patch).eq("id", id);
  if (error) {
    await ctx.reply(`Ошибка обновления: ${error.message}`);
    return;
  }
  await ctx.reply(`✅ Статус обновлён: ${status}`);
});

bot.command("addlead", async (ctx) => {
  if (!adminOnly(ctx)) return;
  const raw = (ctx.match || "").trim();
  const parts = raw.split("|").map((x) => x.trim());
  if (parts.length < 2) {
    await ctx.reply("Используй: /addlead Компания | сайт | email | telegram | телефон");
    return;
  }

  const [company_name, website, email, telegram, phone] = parts;
  const row = await upsertLead({
    company_name,
    website,
    email,
    telegram,
    phone,
    source: "manual",
    status: "new",
  });

  if (!row) {
    await ctx.reply("Не удалось добавить лид.");
    return;
  }
  await ctx.reply(`✅ Лид добавлен: ${row.company_name} (score ${row.score})`);
});

bot.command("stats", async (ctx) => {
  if (!adminOnly(ctx)) return;
  const statuses = ["new", "contacted", "meeting", "proposal", "won", "lost"];
  const rows = [];
  for (const status of statuses) {
    const { count } = await supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", status);
    rows.push(`${status}: ${count || 0}`);
  }
  await ctx.reply(`📊 Воронка\n\n${rows.join("\n")}`);
});

bot.command("autopilot", async (ctx) => {
  if (!adminOnly(ctx)) return;
  await ctx.reply("🚀 Запускаю авто outreach...");
  await runAutoOutreach();
});

bot.command("dnc", async (ctx) => {
  if (!adminOnly(ctx)) return;
  const [id, state] = (ctx.match || "").trim().split(/\s+/);
  if (!id || !["on", "off"].includes(state)) {
    await ctx.reply("Используй: /dnc <id> on|off");
    return;
  }
  const { error } = await supabase.from("leads").update({ do_not_contact: state === "on" }).eq("id", id);
  if (error) {
    await ctx.reply(`Ошибка: ${error.message}`);
    return;
  }
  await ctx.reply(`✅ do_not_contact: ${state}`);
});

cron.schedule(
  DAILY_REPORT_CRON,
  async () => {
    try {
      await sendDailyReport();
    } catch (error) {
      console.error("daily report error", error);
    }
  },
  { timezone: DAILY_REPORT_TIMEZONE }
);

cron.schedule(
  EVENING_REPORT_CRON,
  async () => {
    try {
      await sendEveningFollowupReport();
    } catch (error) {
      console.error("evening report error", error);
    }
  },
  { timezone: DAILY_REPORT_TIMEZONE }
);

if (AUTO_OUTREACH) {
  cron.schedule(
    AUTO_OUTREACH_CRON,
    async () => {
      try {
        await runAutoOutreach();
      } catch (error) {
        console.error("auto outreach error", error);
      }
    },
    { timezone: DAILY_REPORT_TIMEZONE }
  );
}

async function bootstrap() {
  console.log("Lead Agent started");
  try {
    await bot.api.sendMessage(ADMIN_CHAT_ID, "✅ Lead Agent запущен. Команда /start покажет управление.");
  } catch (error) {
    console.warn("Startup notify skipped:", error?.description || error?.message || error);
  }
  await bot.start();
}

bootstrap().catch((e) => {
  console.error(e);
  process.exit(1);
});
